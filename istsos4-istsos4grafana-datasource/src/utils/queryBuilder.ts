import {
  IstSOS4Query,
  EntityType,
  QueryBuilder as MyQueryBuilder,
  OrderByOption,
  FilterCondition,
  TemporalFilter,
  SpatialFilter,
  ObservationFilter,
  VariableFilter,
  EntityFilter,
} from '../types';
import { compareEntityNames, getSingularEntityName } from './utils';

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
export function buildODataQuery(query: IstSOS4Query, encode: boolean = true): string {
  const params: string[] = [];

  let observationFilters: FilterCondition[] = [];
  let nonObservationFilters: FilterCondition[] = [];

  if (query.filters && query.filters.length > 0) {
    nonObservationFilters = query.filters.filter(
      (f) =>
        !(f.type === 'observation' && query.entity === 'Datastreams') &&
        !(f.type === 'variable' && compareEntityNames(f.entity, query.entity))
    );
  }
  if (query.entity === 'Datastreams' && query.filters && query.filters.length) {
    observationFilters = query.filters.filter((f) => f.type === 'observation');
    query.expand = query.expand || [];
    let observationsExpand = query.expand.find((exp) => exp.entity === 'Observations');
    if (!observationsExpand) {
      observationsExpand = { entity: 'Observations' };
      query.expand.push(observationsExpand);
    }
    // If we have Observation filters, add them to the Observations expand
    if (observationFilters.length > 0) {
      const observationFilterExpression = buildFilterExpression(observationFilters);
      if (observationFilterExpression) {
        observationsExpand.subQuery = observationsExpand.subQuery || {};
        observationsExpand.subQuery.filter = observationFilterExpression;
        console.log('Applied observation filter to expand:', observationFilterExpression);
      }
    } else {
      // If there are no Observation filters but there is an Observations expand with a filter,
      // remove the filter from the subQuery
      if (observationsExpand.subQuery?.filter) {
        const newSubQuery = { ...observationsExpand.subQuery };
        delete newSubQuery.filter;
        observationsExpand.subQuery = Object.keys(newSubQuery).length > 0 ? newSubQuery : undefined;
      }
    }
  }

  if (nonObservationFilters.length > 0) {
    const filterExpression = buildFilterExpression(nonObservationFilters);
    if (filterExpression) {
      params.push(`$filter=${encode ? encodeURIComponent(filterExpression) : filterExpression}`);
    }
  }

  if (query.expand && query.expand.length > 0) {
    const expandParts = query.expand.map((exp) => {
      let expandStr = exp.entity;
      if (exp.entity === 'HistoricalLocations') {
        expandStr += '($expand=Locations)';
        // TODO: Add support for other entities that have a subQuery
        // else if may be wrong here, Fix it later
      }
      if (exp.subQuery) {
        const subParams: string[] = [];
        if (exp.subQuery.filter) subParams.push(`$filter=${exp.subQuery.filter}`);
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

  // Rest of the function remains unchanged
  if (query.select && query.select.length > 0) {
    params.push(`$select=${query.select.join(',')}`);
  }

  if (query.orderby && query.orderby.length > 0) {
    const orderParts = query.orderby.map((o) => `${o.property} ${o.direction}`);
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
    params.push(`asOf=${encode ? encodeURIComponent(query.asOf) : query.asOf}`);
  }

  if (query.fromTo) {
    params.push(`from=${encode ? encodeURIComponent(query.fromTo.from) : query.fromTo.from}`);
    params.push(`to=${encode ? encodeURIComponent(query.fromTo.to) : query.fromTo.to}`);
  }

  return params.length > 0 ? `?${params.join('&')}` : '';
}

/**
 * Builds a filter expression from structured filter conditions
 */
export function buildFilterExpression(filters: FilterCondition[]): string {
  const expressions = filters
    .map((filter) => {
      switch (filter.type) {
        case 'temporal':
          return buildTemporalFilter(filter as TemporalFilter);
        case 'basic':
          return buildBasicFilter(filter);
        case 'measurement':
          return buildMeasurementFilter(filter);
        case 'spatial':
          return buildSpatialFilter(filter as SpatialFilter);
        case 'complex':
          return filter.expression;
        case 'observation':
          return buildObservationFilter(filter as ObservationFilter);
        case 'variable':
          return buildVariableFilter(filter as VariableFilter);
        case 'entity':
          return buildEntityFilter(filter as EntityFilter);
        default:
          return '';
      }
    })
    .filter((expr) => expr !== '');

  return expressions.join(' and ');
}

/**
 * Builds a temporal filter expression
 */
function buildTemporalFilter(filter: TemporalFilter): string {
  if (filter.startDate && filter.endDate) {
    return `${filter.field} ge ${formatDateTime(filter.startDate)} and ${filter.field} le ${formatDateTime(
      filter.endDate
    )}`;
  } else if (filter.operator && filter.value !== null && filter.value !== undefined) {
    if (['year', 'month', 'day', 'hour', 'minute', 'second'].includes(filter.operator)) {
      return `${filter.operator}(${filter.field}) eq ${filter.value}`;
    } else {
      return `${filter.field} ${filter.operator} ${formatValue(filter.value)}`;
    }
  }
  return '';
}

/**
 * Builds a basic filter expression (name, id, description)
 */
function buildBasicFilter(filter: FilterCondition): string {
  if (filter.operator && filter.value !== null && filter.value !== undefined) {
    if (['startswith', 'endswith'].includes(filter.operator)) {
      return `${filter.operator}(${filter.field},'${String(filter.value)}')`;
    } else if (filter.operator === 'substringof') {
      return `substringof('${String(filter.value)}',${filter.field})`;
    } else {
      return `${filter.field} ${filter.operator} ${formatValue(filter.value)}`;
    }
  }
  return '';
}

/**
 * Builds a measurement filter expression (unitOfMeasurement, result)
 */
function buildMeasurementFilter(filter: FilterCondition): string {
  if (filter.operator && filter.value !== null && filter.value !== undefined) {
    return `${filter.field} ${filter.operator} ${formatValue(filter.value)}`;
  }
  return '';
}

function buildVariableFilter(filter: VariableFilter): string {
  if (filter.operator && filter.value !== null && filter.value !== undefined) {
    return `${filter.entity}/${filter.field} ${filter.operator} ${formatValue(filter.value)}`;
  }
  if (filter.variableName) {
    return `${filter.entity}/${filter.field} ${filter.operator} $${filter.variableName}`;
  }
  return '';
}

/**
 * Builds an entity filter expression
 */
function buildEntityFilter(filter: EntityFilter): string {
  if (
    !filter.operator ||
    !filter.entity ||
    filter.value === null ||
    filter.value === undefined ||
    filter.value === ''
  ) {
    return '';
  }
  let entityPath: string = getSingularEntityName(filter.entity);
  const path = `${entityPath}/${filter.field}`;
  const value = formatValue(filter.value);
  return `${path} ${filter.operator} ${value}`;
}

/**
 * Builds a spatial filter expression
 */
function buildSpatialFilter(filter: SpatialFilter): string {
  if (!filter.operator || !filter.geometryType) {
    return '';
  }

  let geometryString = '';
  if (filter.geometryType === 'Point') {
    if (!filter.coordinates || filter.coordinates.length < 2) {
      console.warn('Invalid Point coordinates for spatial filter, length less than 2');
      return '';
    }
    geometryString = `geography'POINT (${filter.coordinates[0]} ${filter.coordinates[1]})'`;
  } else if (filter.geometryType === 'Polygon') {
    if (!filter.rings || filter.rings.length === 0) {
      console.warn('Invalid Polygon rings for spatial filter, no rings provided');
      return '';
    }
    const ringsString = filter.rings
      .map((ring) => {
        if (!ring.coordinates || ring.coordinates.length < 4) {
          return '';
        }
        const coords = [...ring.coordinates];
        const firstPoint = coords[0];
        const lastPoint = coords[coords.length - 1];
        if (firstPoint[0] !== lastPoint[0] || firstPoint[1] !== lastPoint[1]) {
          coords.push([firstPoint[0], firstPoint[1]]);
        }
        return coords.map((point) => `${point[0]} ${point[1]}`).join(', ');
      })
      .join('), (');

    if (ringsString.length === 0) {
      return '';
    }

    geometryString = `geography'POLYGON ((${ringsString}))'`;
  } else if (filter.geometryType === 'LineString') {
    if (!filter.coordinates || filter.coordinates.length < 2) {
      return '';
    }
    const coordsString = filter.coordinates.map((point: number[]) => `${point[0]} ${point[1]}`).join(', ');
    geometryString = `geography'LINESTRING (${coordsString})'`;
  }

  if (filter.operator === 'st_distance' && typeof filter.value === 'number') {
    return `${filter.operator}(${filter.field}, ${geometryString}) le ${filter.value}`;
  } else {
    return `${filter.operator}(${filter.field}, ${geometryString})`;
  }
}

/**
 * Builds an observation filter expression
 */
function buildObservationFilter(filter: ObservationFilter): string {
  if (filter.operator && filter.value !== null && filter.value !== undefined) {
    if (filter.field === 'phenomenonTime' || filter.field === 'resultTime') {
      return `${filter.field} ${filter.operator} ${formatDateTime(filter.value as string)}`;
    } else {
      return `${filter.field} ${filter.operator} ${formatValue(filter.value)}`;
    }
  }
  return '';
}

/**
 * Formats a value for use in a filter expression
 */
function formatValue(value: any): string {
  if (typeof value === 'string') {
    return `'${value}'`;
  } else if (value instanceof Date) {
    return formatDateTime(value.toISOString());
  } else {
    return String(value);
  }
}

/**
 * Formats a date-time string for use in a filter expression
 */
function formatDateTime(dateTime: string): string {
  return `'${dateTime}'`;
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
  equals: (property: string, value: string | number) =>
    `${property} eq ${typeof value === 'string' ? `'${value}'` : value}`,
  notEquals: (property: string, value: string | number) =>
    `${property} ne ${typeof value === 'string' ? `'${value}'` : value}`,
  greaterThan: (property: string, value: string | number) =>
    `${property} gt ${typeof value === 'string' ? `'${value}'` : value}`,
  greaterThanOrEqual: (property: string, value: string | number) =>
    `${property} ge ${typeof value === 'string' ? `'${value}'` : value}`,
  lessThan: (property: string, value: string | number) =>
    `${property} lt ${typeof value === 'string' ? `'${value}'` : value}`,
  lessThanOrEqual: (property: string, value: string | number) =>
    `${property} le ${typeof value === 'string' ? `'${value}'` : value}`,

  // String functions
  startsWith: (property: string, value: string) => `startswith(${property},'${value}')`,
  endsWith: (property: string, value: string) => `endswith(${property},'${value}')`,
  substringof: (property: string, value: string) => `substringof('${value}',${property})`,

  // Date/time functions
  year: (property: string, value: number) => `year(${property}) eq ${value}`,
  month: (property: string, value: number) => `month(${property}) eq ${value}`,
  day: (property: string, value: number) => `day(${property}) eq ${value}`,
  hour: (property: string, value: number) => `hour(${property}) eq ${value}`,
  minute: (property: string, value: number) => `minute(${property}) eq ${value}`,
  second: (property: string, value: number) => `second(${property}) eq ${value}`,

  // Time range
  timeRange: (property: string, from: string, to: string) => `${property} ge ${from} and ${property} le ${to}`,

  // Logical operators
  and: (...expressions: string[]) => expressions.join(' and '),
  or: (...expressions: string[]) => expressions.join(' or '),
  not: (expression: string) => `not (${expression})`,

  // Spatial functions (for Location entities)
  within: (property: string, geometry: string) => `st_within(${property}, ${geometry})`,
  intersects: (property: string, geometry: string) => `st_intersects(${property}, ${geometry})`,
  distance: (property: string, geometry: string, distance: number) =>
    `st_distance(${property}, ${geometry}) le ${distance}`,
};
