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
} from '@grafana/data';
import { getBackendSrv, getTemplateSrv } from '@grafana/runtime';

import { IstSOS4Query, MyDataSourceOptions, DEFAULT_QUERY, SensorThingsResponse } from './types';
import { buildApiUrl } from './utils/queryBuilder';

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
    return {
      ...query,
      filter: query.filter ? getTemplateSrv().replace(query.filter, scopedVars) : query.filter,
      alias: query.alias ? getTemplateSrv().replace(query.alias, scopedVars) : query.alias,
    };
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
          return this.transformResponse(response, target);
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

    const data = await Promise.all(promises);
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
        const testUrl = `${this.url}${routePath}${path}`;

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

  // Transform SensorThings API response to Grafana data frames
  private transformResponse(response: any, target: IstSOS4Query) {
    const data = response.data as SensorThingsResponse;
    console.log('SensorThings API Response:', data);
    switch (target.entity) {
      case 'Observations':
        return this.transformObservations(data, target);
      case 'Datastreams':
        if (target.entityId) {
          return this.transformSingleDatastream(data, target);
        }
        return this.transformDatastreams(data, target);
      case 'Things':
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
  // Handle single datastream
  private transformSingleDatastream(data: any, target: IstSOS4Query) {
    console.log('Transforming single datastream - entityId:', target.entityId);
    if (!data) {
      return createDataFrame({
        refId: target.refId,
        name: target.alias || 'Datastream',
        fields: [],
      });
    }

    const datastream = data;
    console.log('Processing single datastream:', datastream);
    
    const unitOfMeasurement = datastream.unitOfMeasurement || {};
    const unitName = unitOfMeasurement.name || 'Unknown';
    const unitSymbol = unitOfMeasurement.symbol || '';
    const unitDefinition = unitOfMeasurement.definition || '';    
    const hasExpandedObservations = target.expand?.some(exp => exp.entity === 'Observations');
    
    if (hasExpandedObservations && datastream.Observations && datastream.Observations.length > 0) {
      console.log('Creating time series with observations count:', datastream.Observations.length);
      
      const timeValues: number[] = [];
      const resultValues: any[] = [];
      
      datastream.Observations.forEach((obs: any) => {
        if (obs.phenomenonTime) {
          timeValues.push(new Date(obs.phenomenonTime).getTime());
          resultValues.push(obs.result);
        }
      });
      
      return createDataFrame({
        refId: target.refId,
        name: target.alias || datastream.name || `${unitName} (${unitSymbol})`,
        fields: [
          {
            name: 'time',
            type: FieldType.time,
            values: timeValues,
          },
          {
            name: unitSymbol || 'value',
            type: FieldType.number,
            values: resultValues,
            config: {
              displayName: `${unitName} (${unitSymbol})`,
              unit: unitSymbol,
            },
          },
        ],
        meta: {
          custom: {
            datastreamId: datastream['@iot.id'],
            datastreamName: datastream.name,
            unitOfMeasurement: {
              name: unitName,
              symbol: unitSymbol,
              definition: unitDefinition,
            },
            observationCount: datastream.Observations.length,
            phenomenonTime: datastream.phenomenonTime,
            observationType: datastream.observationType,
            observedArea: datastream.observedArea,
            properties: datastream.properties,
          },
        },
      });
    } else {
      return createDataFrame({
        refId: target.refId,
        name: target.alias || datastream.name || `Datastream ${datastream['@iot.id']}`,
        fields: [
          {
            name: 'property',
            type: FieldType.string,
            values: [
              'ID', 
              'Name', 
              'Description', 
              'Unit Name', 
              'Unit Symbol', 
              'Unit Definition', 
              'Observation Type',
              'Phenomenon Time'
            ],
          },
          {
            name: 'value',
            type: FieldType.string,
            values: [
              datastream['@iot.id']?.toString() || '',
              datastream.name || '',
              datastream.description || '',
              unitName,
              unitSymbol,
              unitDefinition,
              datastream.observationType || '',
              datastream.phenomenonTime || '',
            ],
          },
        ],
        meta: {
          custom: {
            datastreamId: datastream['@iot.id'],
            datastreamName: datastream.name,
            unitOfMeasurement: {
              name: unitName,
              symbol: unitSymbol,
              definition: unitDefinition,
            },
            phenomenonTime: datastream.phenomenonTime,
            observationType: datastream.observationType,
            observedArea: datastream.observedArea,
            properties: datastream.properties,
          },
        },
      });
    }
  }

  // Handle multiple datastreams
  private transformDatastreams(data: SensorThingsResponse, target: IstSOS4Query) {
    console.log('Transforming multiple datastreams');
    if (!data.value || data.value.length === 0) {
      return createDataFrame({
        refId: target.refId,
        name: target.alias || 'Datastreams',
        fields: [],
      });
    }

    const ids: number[] = [];
    const names: string[] = [];
    const descriptions: string[] = [];
    const units: string[] = [];
    const unitNames: string[] = [];
    const unitDefinitions: string[] = [];

    data.value.forEach((ds: any) => {
      ids.push(ds['@iot.id']);
      names.push(ds.name || '');
      descriptions.push(ds.description || '');
      
      const unitOfMeasurement = ds.unitOfMeasurement || {};
      units.push(unitOfMeasurement.symbol || '');
      unitNames.push(unitOfMeasurement.name || '');
      unitDefinitions.push(unitOfMeasurement.definition || '');
      
    });

    const fields = [
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
      {
        name: 'unit_symbol',
        type: FieldType.string,
        values: units,
      },
      {
        name: 'unit_name',
        type: FieldType.string,
        values: unitNames,
      },
      {
        name: 'unit_definition',
        type: FieldType.string,
        values: unitDefinitions,
      },
    ];


    return createDataFrame({
      refId: target.refId,
      name: target.alias || 'Datastreams',
      fields,
      meta: {
        custom: {
          expandedEntities: target.expand?.map(exp => exp.entity) || [],
        },
      },
    });
  }

  private transformThings(data: SensorThingsResponse, target: IstSOS4Query) {
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
    // if(firstItem['time']!==undefined){
    //   fields.push({
    //     name: 'time',
    //     type: FieldType.time,
    //     values: data.value.map((item: any) => item.time || ''),
    //   });
    // }

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
