import {
  DataSourceInstanceSettings,
  CoreApp,
  ScopedVars,
  DataQueryRequest,
  DataQueryResponse,
  TestDataSourceResponse,
  FieldType,
  createDataFrame,
  DataSourceApi,
  DataFrame,
  MetricFindValue,
} from '@grafana/data';
import { getBackendSrv, getTemplateSrv } from '@grafana/runtime';

import { IstSOS4Query, MyDataSourceOptions, DEFAULT_QUERY, SensorThingsResponse } from './types';
import { buildApiUrl } from './utils/queryBuilder';

import { compareEntityNames, convertEPSG2056ToWGS84 } from './utils/utils'; 
import { transformDatastreams } from './Transformations/datastream';

export class DataSource extends DataSourceApi<IstSOS4Query, MyDataSourceOptions> {
  url?: string;

  constructor(private instanceSettings: DataSourceInstanceSettings<MyDataSourceOptions>) {
    super(instanceSettings);
    this.url = instanceSettings.url;
  }

  getDefaultQuery(_: CoreApp): Partial<IstSOS4Query> {
    return DEFAULT_QUERY;
  }

  applyTemplateVariables(query: IstSOS4Query, scopedVars: ScopedVars) {
    let modifiedQuery = {
      ...query,
      alias: query.alias ? getTemplateSrv().replace(query.alias, scopedVars) : query.alias,
    };
    if (modifiedQuery.filters) {
      modifiedQuery.filters = modifiedQuery.filters.map(filter => {
        if (filter.type !== 'variable') return filter;
          const variableFilter = filter as any;
          const variableValue = getTemplateSrv().replace(`$${variableFilter.variableName}`, scopedVars);
          console.log(`Processing variable filter: ${variableFilter.variableName}, entity: ${variableFilter.entity}, value: ${variableValue}`);
          if (!variableValue || variableValue === `$${variableFilter.variableName}`)
            return { ...variableFilter, value: null };
          if (compareEntityNames(variableFilter.entity, query.entity)) {
            const numericValue = parseInt(variableValue, 10);
            if (!isNaN(numericValue)) {
              modifiedQuery.entityId = numericValue;
              console.log(`Applied variable ${variableFilter.variableName} as entityId: ${numericValue}`);
              return null;
              // Remove Variable filter that has entity equal to the query entity
            }
          }
          console.log(`Updated variable filter ${variableFilter.variableName} with value: ${variableValue}`);
          return { ...variableFilter, value: variableValue };
      }).filter(Boolean); 
    }

    return modifiedQuery;
  }

  filterQuery(query: IstSOS4Query): boolean {
    return !!query.entity;
  }
  /**
   * transformResponse: weather to transform the response into Grafana data frames or return raw data.
   * If true, the response will be transformed into Grafana data frames.
   * it maybe useful for intermediate requests (when we do not need to display the response in Grafana panels).
   */
  async query(options: DataQueryRequest<IstSOS4Query>, transformResponse: boolean = true): Promise<DataQueryResponse> {
    const promises = options.targets.map(async (target) => {
      if (!this.filterQuery(target)) {
        return createDataFrame({ fields: [] });
      }

      try {
        const query = this.applyTemplateVariables(target, options.scopedVars);
        console.log('Query after variable substitution:', query);
        
        const routePath = '/sensorapi';
        const path = this.instanceSettings.jsonData.path || '';
        const baseUrl = `${this.url}${routePath}${path}`;
        const apiUrl = buildApiUrl(baseUrl, query);
        console.log('Executing SensorThings API query:', apiUrl);
        const response = await getBackendSrv().datasourceRequest({
          url: apiUrl,
          method: 'GET',
        });        
        
        if (transformResponse) {
          const result = this.transformResponse(response, query);
          return Array.isArray(result) ? result : [result];
        } else {
          const rawData = response.data as SensorThingsResponse;
          return createDataFrame({
            refId: target.refId,
            name: target.alias || target.entity,
            fields: [
              {
                name: 'entities',
                type: FieldType.other,
                values: [rawData.value || []],
              },
            ],
            meta: {
              custom: {
                rawResponse: rawData,
                count: rawData['@iot.count'],
                nextLink: rawData['@iot.nextLink'],
              },
            },
          });
        }
      } catch (error) {
        console.error('Query error:', error);
        return createDataFrame({
          refId: target.refId,
          fields: [],
          meta: {
            notices: [{ severity: 'error', text: `Query failed: ${error instanceof Error ? error.message : 'Unknown error'}` }]
          }
        });
      }
    });
    const results = await Promise.all(promises);
    const data = results.flat();
    return { data };
  }

  async testDatasource(): Promise<TestDataSourceResponse> {
    try {
      const config = this.instanceSettings.jsonData;      
      if (!config.apiUrl) {
        return {
          status: 'error',
          message: 'API URL is required',
        };
      }
      if (!config.oauth2TokenUrl) {
        return {
          status: 'error',
          message: 'OAuth2 token URL is required',
        };
      }

      if (!config.oauth2Username) {
        return {
          status: 'error',
          message: 'OAuth2 username is required',
        };
      }

      if (!config.oauth2ClientId) {
        return {
          status: 'error',
          message: 'OAuth2 client ID is required',
        };
      }
      try {
        const routePath = '/sensorapi';
        const path = config.path || '';
        const testUrl = `${this.url}${routePath}${path}/Things`;

        const response = await getBackendSrv().datasourceRequest({
          url: testUrl,
          method: 'GET',
        });
        console.log("Connection test response:", response);
        
        return {
          status: 'success',
          message: `Successfully connected to SensorThings API! Response status: ${response.status || 200}`,
        };
      } catch (error) {
        console.error('Connection test failed:', error);
        
        if (error instanceof Error) {
          if (error.message.includes('401') || error.message.includes('Unauthorized')) {
            return {
              status: 'error',
              message: 'OAuth2 authentication failed. Please check your credentials.',
            };
          }
          if (error.message.includes('404') || error.message.includes('Not Found')) {
            return {
              status: 'error',
              message: 'API endpoint not found. Please check your API URL and path.',
            };
          }
        }
        
        return {
          status: 'error',
          message: `Connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        };
      }
    } catch (error) {
      console.error('Test datasource error:', error);
      return {
        status: 'error',
        message: `Test failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  async metricFindQuery(query: string, options?: any): Promise<MetricFindValue[]> {
    console.log('Metric find query:', query);
    const replaced = getTemplateSrv().replace(query, options?.scopedVars);
    
    try {
      let entity = replaced;
      let filter = '';
      let select = ['name', 'description', '@iot.id'];
      let top = 100;
      
      if (replaced.includes('?')) {
        const [entityPart, paramsPart] = replaced.split('?');
        entity = entityPart;
        
        const params = new URLSearchParams(paramsPart);
        
        if (params.has('$filter')) {
          filter = params.get('$filter') || '';
        }
        
        if (params.has('$select')) {
          const selectParam = params.get('$select');
          if (selectParam) {
            select = selectParam.split(',').map(s => s.trim());
          }
        }
        
        if (params.has('$top')) {
          const topParam = params.get('$top');
          if (topParam) {
            top = parseInt(topParam, 10);
          }
        }
      }
      
      const queryObj: IstSOS4Query = {
        refId: 'variables',
        entity: entity as any, 
        filters: filter ? [{
          id: 'metricFind',
          type: 'basic',
          field: 'name',
          operator: 'eq',
          value: filter,
        }] : [],
        select,
        top,
      };
      
      const routePath = '/sensorapi';
      const path = this.instanceSettings.jsonData.path || '';
      const baseUrl = `${this.url}${routePath}${path}`;
      const apiUrl = buildApiUrl(baseUrl, queryObj);
      console.log('Executing SensorThings API query for variables:', apiUrl);
      
      const response = await getBackendSrv().datasourceRequest({
        url: apiUrl,
        method: 'GET',
      });
      
      const responseData = response.data as any;
      
      if (!responseData || !responseData.value || !Array.isArray(responseData.value)) {
        return [];
      }
      
      const entities = responseData.value as any[];
      
      return entities.map((entity: any) => {
        let text = entity.name || entity['@iot.id']?.toString() || '';
        let value = entity['@iot.id']?.toString() || '';
        
        if (queryObj.entity === 'Observations') {
          text = entity.resultTime || entity.phenomenonTime || entity['@iot.id']?.toString() || '';
        }
        
        return { text, value };
      });
    } catch (error) {
      console.error('Error in metricFindQuery:', error);
      return [];
    }
  }

  // Transform SensorThings API response to Grafana data frames
  private transformResponse(response: any, target: IstSOS4Query): DataFrame | DataFrame[] {
    const data = response.data as SensorThingsResponse;
    console.log('SensorThings API Response:', data);
    switch (target.entity) {
      case 'Observations':
        return this.transformObservations(data, target);
      case 'Datastreams':
        return transformDatastreams(data, target);
      case 'Things':
        if (target.entityId) {
          console.log('Transforming single Thing with entityId:', target.entityId);
          return this.transformSingleThing(data, target);
        }
        return this.transformThings(data, target);
      case 'Locations':
        return this.transformLocations(data, target);
      case 'Sensors':
        return this.transformSensors(data, target);
      case 'ObservedProperties':
        return this.transformObservedProperties(data, target);
      case 'FeaturesOfInterest':
        return this.transformFeaturesOfInterest(data, target);
      case 'HistoricalLocations':
        return this.transformHistoricalLocations(data, target);
      default:
        return this.transformGeneric(data, target);
    }
  }

  private transformObservations(data: SensorThingsResponse, target: IstSOS4Query) {
    if (!data.value || data.value.length === 0) {
      return createDataFrame({
        refId: target.refId,
        name: target.alias || 'Observations',
        fields: [],
      });
    }

    const timeValues: number[] = [];
    const resultValues: any[] = [];

    data.value.forEach((obs: any) => {
      if (obs.phenomenonTime) {
        timeValues.push(new Date(obs.phenomenonTime).getTime());
        resultValues.push(obs.result);
      }
    });

    return createDataFrame({
      refId: target.refId,
      name: target.alias || 'Observations',
      fields: [
        {
          name: 'time',
          type: FieldType.time,
          values: timeValues,
        },
        {
          name: 'value',
          type: FieldType.number,
          values: resultValues,
        },
      ],
    });
  }
  // Handle single Thing
  private transformSingleThing(data: any, target: IstSOS4Query) {
    console.log('Transforming single Thing - entityId:', target.entityId);
    if (!data) {
      return createDataFrame({
        refId: target.refId,
        name: target.alias || 'Thing',
        fields: [],
      });
    }

    const thing = data;
    console.log('Processing single Thing:', thing);
    
    const hasExpandedHistoricalLocations = target.expand?.some(exp => exp.entity === 'HistoricalLocations');
    
    if (hasExpandedHistoricalLocations && thing.HistoricalLocations && thing.HistoricalLocations.length > 0) {
      console.log('Creating geospatial data with historical locations count:', thing.HistoricalLocations.length);
      
      const timeValues: number[] = [];
      const latValues: number[] = [];
      const lonValues: number[] = [];
      const locationNames: string[] = [];
      const locationDescriptions: string[] = [];
      
      thing.HistoricalLocations.forEach((histLoc: any) => {
        if (histLoc.time && histLoc.Locations && histLoc.Locations.length > 0) {
          timeValues.push(new Date(histLoc.time).getTime());          
            // This is assumption till now
            // Use first location if multiple
            const location = histLoc.Locations[0]; 
            locationNames.push(location.name || '');
            locationDescriptions.push(location.description || '');            
            if (location.location && location.location.coordinates) {
              const coords = location.location.coordinates;
              if (Array.isArray(coords) && coords.length >= 2) {
                const x=coords[0];
                const y=coords[1];
                const [lon,lat] = convertEPSG2056ToWGS84(x, y);
                lonValues.push(lon);
                latValues.push(lat);
              } 
            } 
        }
      });
      console.log("All lengths:", 
        timeValues.length, 
        latValues.length, 
        lonValues.length, 
        locationNames.length, 
        locationDescriptions.length
      )
      
      return createDataFrame({
        refId: target.refId,
        name: target.alias || thing.name || `Thing ${thing['@iot.id']} Locations`,
        fields: [
          {
            name: 'time',
            type: FieldType.time,
            values: timeValues,
          },
          {
            name: 'latitude',
            type: FieldType.number,
            values: latValues,
            config: {
              displayName: 'Latitude',
              unit: 'degree',
            },
          },
          {
            name: 'longitude',
            type: FieldType.number,
            values: lonValues,
            config: {
              displayName: 'Longitude',
              unit: 'degree',
            },
          },
          {
            name: 'location_name',
            type: FieldType.string,
            values: locationNames,
          },
          {
            name: 'location_description',
            type: FieldType.string,
            values: locationDescriptions,
          },
        ],
        meta: {
          custom: {
            thingId: thing['@iot.id'],
            thingName: thing.name,
            thingDescription: thing.description,
            historicalLocationCount: thing.HistoricalLocations.length,
            properties: thing.properties,
            isGeospatialData: true,
          },
        },
      });
    } else {
      return createDataFrame({
        refId: target.refId,
        name: target.alias || thing.name || `Thing ${thing['@iot.id']}`,
        fields: [
          {
            name: 'property',
            type: FieldType.string,
            values: [
              'ID', 
              'Name', 
              'Description',
            ],
          },
          {
            name: 'value',
            type: FieldType.string,
            values: [
              thing['@iot.id']?.toString() || '',
              thing.name || '',
              thing.description || '',
            ],
          },
        ],
        meta: {
          custom: {
            thingId: thing['@iot.id'],
            thingName: thing.name,
            thingDescription: thing.description,
          },
        },
      });
    }
  }

  private transformThings(data: SensorThingsResponse, target: IstSOS4Query) {
    console.log("Transforming Things");
    if (!data.value || data.value.length === 0) {
      return createDataFrame({
        refId: target.refId,
        name: target.alias || 'Things',
        fields: [],
      });
    }

    const ids: number[] = [];
    const names: string[] = [];
    const descriptions: string[] = [];

    data.value.forEach((thing: any) => {
      ids.push(thing['@iot.id']);
      names.push(thing.name || '');
      descriptions.push(thing.description || '');
    });

    return createDataFrame({
      refId: target.refId,
      name: target.alias || 'Things',
      fields: [
        {
          name: 'id',
          type: FieldType.number,
          values: ids,
        },
        {
          name: 'name',
          type: FieldType.string,
          values: names,
        },
        {
          name: 'description',
          type: FieldType.string,
          values: descriptions,
        },
      ],
    });
  }

  private transformLocations(data: SensorThingsResponse, target: IstSOS4Query) {
    return this.transformGeneric(data, target);
  }

  private transformSensors(data: SensorThingsResponse, target: IstSOS4Query) {
    return this.transformGeneric(data, target);
  }

  private transformObservedProperties(data: SensorThingsResponse, target: IstSOS4Query) {
    return this.transformGeneric(data, target);
  }

  private transformFeaturesOfInterest(data: SensorThingsResponse, target: IstSOS4Query) {
    return this.transformGeneric(data, target);
  }

  private transformHistoricalLocations(data: SensorThingsResponse, target: IstSOS4Query) {
    return this.transformGeneric(data, target);
  }

  private transformGeneric(data: SensorThingsResponse, target: IstSOS4Query) {
    if (!data.value || data.value.length === 0) {
      return createDataFrame({
        refId: target.refId,
        name: target.alias || target.entity,
        fields: [],
      });
    }

    const firstItem = data.value[0];
    const fields: any[] = [];

    // Extract common fields
    if (firstItem['@iot.id'] !== undefined) {
      fields.push({
        name: 'id',
        type: FieldType.number,
        values: data.value.map((item: any) => item['@iot.id']),
      });
    }

    if (firstItem.name !== undefined) {
      fields.push({
        name: 'name',
        type: FieldType.string,
        values: data.value.map((item: any) => item.name || ''),
      });
    }
    if (firstItem.description !== undefined) {
      fields.push({
        name: 'description',
        type: FieldType.string,
        values: data.value.map((item: any) => item.description || ''),
      });
    }
    if (fields.length === 0) {
      fields.push({
        name: 'data',
        type: FieldType.string,
        values: data.value.map((item: any) => JSON.stringify(item)),
      });
    }
    return createDataFrame({
      refId: target.refId,
      name: target.alias || target.entity,
      fields,
      meta: {
        custom: {
          count: data['@iot.count'],
          nextLink: data['@iot.nextLink'],
        },
      },
    });
  }
}
