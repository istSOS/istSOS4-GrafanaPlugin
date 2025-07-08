import { IstSOS4Query, EntityType, QueryBuilder as MyQueryBuilder, OrderByOption } from '../types';

/*
This file contains the Query Builder class.
The Query Builder class is used to build the query string for the IstSOS4 API following Query Builder Pattern.
The file also contains Common Filter Expressions for SensorThings API.
*/

export class QueryBuilder implements MyQueryBuilder {
  private query: Partial<IstSOS4Query> = {};

  entity(type: EntityType): QueryBuilder {
    this.query.entity = type;
    return this;
  }

  withId(id: number): QueryBuilder {
    this.query.entityId = id;
    return this;
  }

  filter(expression: string): QueryBuilder {
    this.query.filter = expression;
    return this;
  }

  expand(entity: EntityType, subQuery?: any): QueryBuilder {
    if (!this.query.expand) {
      this.query.expand = [];
    }
    this.query.expand.push({ entity, subQuery });
    return this;
  }

  select(...properties: string[]): QueryBuilder {
    this.query.select = properties;
    return this;
  }

  orderBy(property: string, direction: 'asc' | 'desc' = 'asc'): QueryBuilder {
    if (!this.query.orderby) {
      this.query.orderby = [];
    }
    this.query.orderby.push({ property, direction });
    return this;
  }

  top(count: number): QueryBuilder {
    this.query.top = count;
    return this;
  }

  skip(count: number): QueryBuilder {
    this.query.skip = count;
    return this;
  }

  count(include: boolean = true): QueryBuilder {
    this.query.count = include;
    return this;
  }

  asOf(timestamp: string): QueryBuilder {
    this.query.asOf = timestamp;
    return this;
  }

  fromTo(from: string, to: string): QueryBuilder {
    this.query.fromTo = { from, to };
    return this;
  }

  alias(alias: string): QueryBuilder {
    this.query.alias = alias;
    return this;
  }

  resultFormat(format: 'default' | 'dataArray'): QueryBuilder {
    this.query.resultFormat = format;
    return this;
  }

  build(): IstSOS4Query {
    if (!this.query.entity) {
      throw new Error('Entity type is required');
    }
    return this.query as IstSOS4Query;
  }
}

export function createQueryBuilder(): QueryBuilder {
  return new QueryBuilder();
}

/**
 * Builds the query string from the query object
 */
export function buildODataQuery(query: IstSOS4Query): string {
  const params: string[] = [];

  
  if (query.filter) {
    params.push(`$filter=${encodeURIComponent(query.filter)}`);
  }

  if (query.expand && query.expand.length > 0) {
    const expandParts = query.expand.map(exp => {
      let expandStr = exp.entity;      
      if (exp.entity === 'HistoricalLocations') {
        expandStr += '($expand=Locations)';
      } else if (exp.subQuery) {
        const subParams: string[] = [];
        if (exp.subQuery.filter) subParams.push(`$filter=${encodeURIComponent(exp.subQuery.filter)}`);
        if (exp.subQuery.select) subParams.push(`$select=${exp.subQuery.select.join(',')}`);
        if (exp.subQuery.orderby) {
          const orderParts = exp.subQuery.orderby.map((o: OrderByOption) => `${o.property} ${o.direction}`);
          subParams.push(`$orderby=${orderParts.join(',')}`);
        }
        if (exp.subQuery.top) subParams.push(`$top=${exp.subQuery.top}`);
        if (exp.subQuery.skip) subParams.push(`$skip=${exp.subQuery.skip}`);
        
        if (subParams.length > 0) {
          expandStr += `(${subParams.join(';')})`;
        }
      }
      return expandStr;
    });
    params.push(`$expand=${expandParts.join(',')}`);
  }

  if (query.select && query.select.length > 0) {
    params.push(`$select=${query.select.join(',')}`);
  }

  if (query.orderby && query.orderby.length > 0) {
    const orderParts = query.orderby.map(o => `${o.property} ${o.direction}`);
    params.push(`$orderby=${orderParts.join(',')}`);
  }

  if (query.top !== undefined) {
    params.push(`$top=${query.top}`);
  }

  if (query.skip !== undefined) {
    params.push(`$skip=${query.skip}`);
  }

  if (query.count) {
    params.push('$count=true');
  }

  if (query.resultFormat && query.resultFormat !== 'default') {
    params.push(`$resultFormat=${query.resultFormat}`);
  }

  if (query.asOf) {
    params.push(`asOf=${encodeURIComponent(query.asOf)}`);
  }

  if (query.fromTo) {
    params.push(`from=${encodeURIComponent(query.fromTo.from)}`);
    params.push(`to=${encodeURIComponent(query.fromTo.to)}`);
  }

  return params.length > 0 ? `?${params.join('&')}` : '';
}

/**
 * Builds the complete API URL for the query
 */
export function buildApiUrl(baseUrl: string, query: IstSOS4Query): string {
  let url = `${baseUrl}/${query.entity}`;
  
  if (query.entityId !== undefined) {
    url += `(${query.entityId})`;
  }
  
  url += buildODataQuery(query);
  
  return url;
}

/**
 * Common filter expressions for SensorThings API
 */
export const FilterExpressions = {
  // Comparison operators
  equals: (property: string, value: string | number) => `${property} eq ${typeof value === 'string' ? `'${value}'` : value}`,
  notEquals: (property: string, value: string | number) => `${property} ne ${typeof value === 'string' ? `'${value}'` : value}`,
  greaterThan: (property: string, value: string | number) => `${property} gt ${typeof value === 'string' ? `'${value}'` : value}`,
  greaterThanOrEqual: (property: string, value: string | number) => `${property} ge ${typeof value === 'string' ? `'${value}'` : value}`,
  lessThan: (property: string, value: string | number) => `${property} lt ${typeof value === 'string' ? `'${value}'` : value}`,
  lessThanOrEqual: (property: string, value: string | number) => `${property} le ${typeof value === 'string' ? `'${value}'` : value}`,
  
  // String functions
  startsWith: (property: string, value: string) => `startswith(${property},'${value}')`,
  endsWith: (property: string, value: string) => `endswith(${property},'${value}')`,
  contains: (property: string, value: string) => `contains(${property},'${value}')`,
  
  // Date/time functions
  year: (property: string, value: number) => `year(${property}) eq ${value}`,
  month: (property: string, value: number) => `month(${property}) eq ${value}`,
  day: (property: string, value: number) => `day(${property}) eq ${value}`,
  hour: (property: string, value: number) => `hour(${property}) eq ${value}`,
  minute: (property: string, value: number) => `minute(${property}) eq ${value}`,
  second: (property: string, value: number) => `second(${property}) eq ${value}`,
  
  // Time range
  timeRange: (property: string, from: string, to: string) => 
    `${property} ge ${from} and ${property} le ${to}`,
  
  // Logical operators
  and: (...expressions: string[]) => expressions.join(' and '),
  or: (...expressions: string[]) => expressions.join(' or '),
  not: (expression: string) => `not (${expression})`,
  
  // Spatial functions (for Location entities)
  within: (property: string, geometry: string) => `st_within(${property}, ${geometry})`,
  intersects: (property: string, geometry: string) => `st_intersects(${property}, ${geometry})`,
  distance: (property: string, geometry: string, distance: number) => `st_distance(${property}, ${geometry}) le ${distance}`,
}; 