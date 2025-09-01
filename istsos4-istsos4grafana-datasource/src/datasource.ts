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
import { firstValueFrom } from 'rxjs';

import { IstSOS4Query, MyDataSourceOptions, DEFAULT_QUERY, SensorThingsResponse } from './types';
import { buildApiUrl } from './queryBuilder';

import { compareEntityNames, searchExpandEntity } from './utils/utils';
import { transformDatastreams } from './transformations/datastream';
import { transformThings } from 'transformations/thing';
import { transformSensors } from 'transformations/sensor';
import { transformObservedProperties } from 'transformations/observedProperty';
import { transformLocations } from 'transformations/location';
import { transformHistoricalLocations } from 'transformations/historicalLocations';
import { transformFeatureOfInterest } from 'transformations/featureOfInterest';
import { transformObservations } from 'transformations/observations';

export class DataSource extends DataSourceApi<IstSOS4Query, MyDataSourceOptions> {
  url?: string;

  constructor(private instanceSettings: DataSourceInstanceSettings<MyDataSourceOptions>) {
    super(instanceSettings);
    this.url = instanceSettings.url;
  }

  getDefaultQuery(_: CoreApp): Partial<IstSOS4Query> {
    return DEFAULT_QUERY;
  }

  /**
   * Method to handle pagination for SensorThings API responses
   * Handles both single entity responses (when entityId is specified) and multiple entities responses
   * Also handles pagination for expanded Observations within entities
   * @param baseUrl The base API URL
   * @param query The query object
   * @returns Combined response with all paginated data
   */
  private async fetchAllPages(baseUrl: string, query: IstSOS4Query): Promise<SensorThingsResponse> {
    const modifiedQuery = { ...query };
    const hasEntityId = modifiedQuery.entityId !== undefined;
    const topDefined = modifiedQuery.top !== undefined;

    if (!topDefined && !hasEntityId && this.instanceSettings.jsonData.defaultTop) {
      modifiedQuery.top = this.instanceSettings.jsonData.defaultTop;
    }
    const hasExpandedObservations =
    modifiedQuery.expand?.some((exp) => exp.entity === 'Observations') ||
    (modifiedQuery.expression && searchExpandEntity(modifiedQuery.expression, 'Observations'));
    if (hasExpandedObservations) {
      console.log('Query includes expanded Observations');
      modifiedQuery.expand = modifiedQuery.expand?.map((exp) => {
        if (exp.entity === 'Observations') {
          return {
            ...exp,
            subQuery: {
              ...exp.subQuery,
              top: this.instanceSettings.jsonData.defaultExpandedObservationsTop || 1000,
            },
          };
        }
        return exp;
      });
    }
    const queryURL = buildApiUrl(baseUrl, modifiedQuery);
    console.log('Executing SensorThings API query:', queryURL);
    const allData: any[] = [];
    let nextUrl: string | undefined = queryURL;

    while (nextUrl) {
      let cleanUrl = nextUrl;
      
      if (allData.length > 0) {
        const urlParts = nextUrl.split(this.instanceSettings.jsonData.apiUrl || '');
        if (urlParts.length > 1) {
          const pathToEncode = urlParts[1]; 
          const encodedPath = encodeURIComponent(pathToEncode);
          cleanUrl = `${baseUrl}/${encodedPath}`;
        }
      }
      const response: any = await firstValueFrom(
        getBackendSrv().fetch({
          url: cleanUrl,
          method: 'GET',
        })
      );

      const pageData: any = response?.data;
      if (!pageData) {
        break;
      }

      if (hasEntityId) {
        if (pageData['@iot.id'] !== undefined) {
          if (hasExpandedObservations && pageData.Observations) {
            await this.handleExpandedObservationsPagination(pageData, baseUrl);
          }
          allData.push(pageData);
        }
        break;
      } else {
        if (!pageData.value || !Array.isArray(pageData.value)) {
          break;
        }
        if (hasExpandedObservations) {
          for (const entity of pageData.value) {
            if (entity.Observations) {
              await this.handleExpandedObservationsPagination(entity, baseUrl);
            }
          }
        }
        allData.push(...pageData.value);
        if (topDefined) {
          break;
        }
        nextUrl = pageData['@iot.nextLink'];
      }
    }

    return {
      value: allData,
      '@iot.count': allData.length,
      '@iot.nextLink': undefined,
    };
  }

  /**
   * Handle pagination for expanded Observations within an entity
   * @param entity The entity containing expanded Observations
   * @param baseUrl The base API URL
   */
  private async handleExpandedObservationsPagination(entity: any, baseUrl: string): Promise<void> {
    if (!entity.Observations || !Array.isArray(entity.Observations)) {
      return;
    }
    let nextObservationsUrl = entity['Observations@iot.nextLink'];
    if (!nextObservationsUrl) {
      return;
    }

    const allObservations = [...entity.Observations];

    while (nextObservationsUrl) {
    const urlParts = nextObservationsUrl.split(this.instanceSettings.jsonData.apiUrl || '');
      if (urlParts.length > 1) {
        const pathToEncode = urlParts[1];
        const encodedPath = encodeURIComponent(pathToEncode);
        const cleanUrl = `${baseUrl}/${encodedPath}`;
        console.log(`Fetching next page of Observations: ${cleanUrl}`);

        try {
          const response: any = await firstValueFrom(
            getBackendSrv().fetch({
              url: cleanUrl,
              method: 'GET',
            })
          );

        const observationsData: any = response?.data;
        if (!observationsData || !observationsData.value || !Array.isArray(observationsData.value)) {
          break;
        }

        allObservations.push(...observationsData.value);
        console.log(
          `Fetched ${observationsData.value.length} additional Observations, total: ${allObservations.length}`
        );
        nextObservationsUrl = observationsData['@iot.nextLink'];
      } catch (error) {
        console.error('Error fetching expanded Observations page:', error);
        break;
      }
    }

    entity.Observations = allObservations;
    delete entity['Observations@iot.nextLink'];
  }
}
/*
Function for Custom Query Expression Variable Subsitutation(focus on the $vars within Single quotes)
*/
  private applyCustomVariableSubstitution(expression: string, scopedVars: ScopedVars): string {
    if (!expression) {
      return expression;
    }
    // Regular expression to find content within single quotes that contains $
    const quotedVariablePattern = /'([^']*\$[^']*)'/g;
    return expression.replace(quotedVariablePattern, (match, quotedContent) => {
      const substituted = getTemplateSrv().replace(quotedContent, scopedVars);
      if (substituted.includes(',')) {
        const values = substituted.split(',').map(val => val.trim());
        return `'${values.join("','")}'`;
      }
      return `'${substituted}'`;
    });
  }

  // Apply Variables Subsitutation
  // - if query.expression is defined, then it applies template variable substitution on the expression only
  // - else it applies the filters defined in the Variable filters
  applyTemplateVariables(query: IstSOS4Query, scopedVars: ScopedVars) {
    let modifiedQuery = {
      ...query,
      alias: query.alias ? getTemplateSrv().replace(query.alias, scopedVars) : query.alias,
    };

    if (modifiedQuery.expression) {
      modifiedQuery.expression = this.applyCustomVariableSubstitution(modifiedQuery.expression, scopedVars);
    }

    if (modifiedQuery.filters) {
      modifiedQuery.filters = modifiedQuery.filters
        .map((filter) => {
          if (filter.type !== 'variable') {
            return filter;
          }
          const variableFilter = filter as any;
          const variableValue = getTemplateSrv().replace(variableFilter.variableName, scopedVars);
          if (!variableValue || variableValue === variableFilter.variableName) {
            return { ...variableFilter, value: null };
          }

          if (compareEntityNames(variableFilter.entity, query.entity)) {
            const numericValue = parseInt(variableValue, 10);
            if (!isNaN(numericValue)) {
              modifiedQuery.entityId = numericValue;
              console.log(`Applied variable ${variableFilter.variableName} as entityId: ${numericValue}`);
              return null;
            }
          }
          return { ...variableFilter, value: variableValue };
        })

        .filter(Boolean);
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
   * Default Grafana function that is get triggered when hitting the RunQuery button
   */
  async query(options: DataQueryRequest<IstSOS4Query>, transformResponse = true): Promise<DataQueryResponse> {
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
        const combinedResponse = await this.fetchAllPages(baseUrl, query);
        if (transformResponse) {
          const result = this.transformResponse({ data: combinedResponse }, query);
          return Array.isArray(result) ? result : [result];
        } else {
          return createDataFrame({
            refId: target.refId,
            name: target.alias || target.entity,
            fields: [
              {
                name: 'entities',
                type: FieldType.other,
                values: [combinedResponse.value || []],
              },
            ],
            meta: {
              custom: {
                rawResponse: combinedResponse,
                count: combinedResponse['@iot.count'],
                nextLink: combinedResponse['@iot.nextLink'],
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
            notices: [
              { severity: 'error', text: `Query failed: ${error instanceof Error ? error.message : 'Unknown error'}` },
            ],
          },
        });
      }
    });
    const results = await Promise.all(promises);
    const data = results.flat();
    return { data };
  }
  /*
  Function to test the API that is being entered by the user
  Grafana Specific
  */
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
        const testUrl = `${this.url}${routePath}${path}/`;

        const response = await firstValueFrom(
          getBackendSrv().fetch({
            url: testUrl,
            method: 'GET',
          })
        );
        console.log('Connection test response:', response);

        return {
          status: 'success',
          message: `Successfully connected to SensorThings API! Response status: ${response.status || 200}`,
        };
      } catch (error) {
        console.error('Connection test failed:', error);
        if (error && typeof error === 'object' && 'status' in error) {
          const errorResponse = error as any;
          if (errorResponse.status === 400) {
            return {
              status: 'error',
              message: 'Authentication to data source failed. Please verify your OAuth2 configuration.',
            };
          }
          if (errorResponse.status === 401) {
            return {
              status: 'error',
              message: 'OAuth2 authentication failed. Please check your credentials.',
            };
          }
          if (errorResponse.status === 404) {
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
  /*
   * Grafana specific function that gets called on Variable editor changes
     Logic that should be triggered on change in Variable QueryEditor should be applied here
   */
  async metricFindQuery(query: IstSOS4Query, options?: any): Promise<MetricFindValue[]> {
    console.log('Original query:', query);
    const modifiedQuery = this.applyTemplateVariables(query, options?.scopedVars);
    console.log('Modified query:', modifiedQuery);
    try {
      const routePath = '/sensorapi';
      const path = this.instanceSettings.jsonData.path || '';
      const baseUrl = `${this.url}${routePath}${path}`;
      const responseData = await this.fetchAllPages(baseUrl, modifiedQuery);
      if (!responseData.value || !Array.isArray(responseData.value)) {
        return [];
      }
      const result = responseData.value.map((entity: any) => {
        let text = entity.name || entity['@iot.id']?.toString() || '';
        let value = entity['@iot.id']?.toString() || '';
        return { text, value };
      });
      return result;
    } catch (error) {
      console.error('Error in metricFindQuery:', error);
      return [];
    }
  }

  // Transform SensorThings API response to Grafana data frames
  private transformResponse(response: any, target: IstSOS4Query): DataFrame | DataFrame[] {
    const data = response.data as SensorThingsResponse;
    switch (target.entity) {
      case 'Observations':
        return transformObservations(data, target);
      case 'Datastreams':
        return transformDatastreams(data, target);
      case 'Things':
        return transformThings(data, target);
      case 'Locations':
        return transformLocations(data, target);
      case 'Sensors':
        return transformSensors(data, target);
      case 'ObservedProperties':
        return transformObservedProperties(data, target);
      case 'FeaturesOfInterest':
        return transformFeatureOfInterest(data, target);
      case 'HistoricalLocations':
        return transformHistoricalLocations(data, target);
      default:
        return this.transformGeneric(data, target);
    }
  }

  // Fallback Transform function that gets the common fields on all entities
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
