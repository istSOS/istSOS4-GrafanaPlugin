import { SelectableValue } from "@grafana/data";
import { EntityType, FilterField, FilterType, ComparisonOperator, StringOperator, SpatialOperator, TemporalFunction } from "../types";
export const ENTITY_OPTIONS: Array<SelectableValue<EntityType>> = [
    { label: 'Things', value: 'Things', description: 'Physical or virtual objects' },
    { label: 'Locations', value: 'Locations', description: 'Geographic positions' },
    { label: 'Sensors', value: 'Sensors', description: 'Measurement instruments' },
    { label: 'Observed Properties', value: 'ObservedProperties', description: 'What is being measured' },
    { label: 'Datastreams', value: 'Datastreams', description: 'Links Things, Sensors, and ObservedProperties' },
    { label: 'Observations', value: 'Observations', description: 'Actual measurements' },
    { label: 'Features of Interest', value: 'FeaturesOfInterest', description: 'Real-world features being observed' },
    { label: 'Historical Locations', value: 'HistoricalLocations', description: 'Movement history of Things' },
  ];
  
 export const RESULT_FORMAT_OPTIONS: Array<SelectableValue<string>> = [
    { label: 'Default', value: 'default' },
    { label: 'Data Array', value: 'dataArray' },
  ];
  
 export const THINGS_EXPAND_OPTIONS: Array<SelectableValue<EntityType>> = [
    { label: 'Locations', value: 'Locations', description: 'Include related locations' },
    { label: 'Datastreams', value: 'Datastreams', description: 'Include related datastreams' },
    { label: 'HistoricalLocations', value: 'HistoricalLocations', description: 'Include historical locations' },
  ];
  
  export const DATASTREAMS_EXPAND_OPTIONS: Array<SelectableValue<EntityType>> = [
    { label: 'Observations', value: 'Observations', description: 'Include related observations' },
    { label: 'Thing', value: 'Things', description: 'Include the related Thing' },
    { label: 'Sensor', value: 'Sensors', description: 'Include the related Sensor' },
    { label: 'ObservedProperty', value: 'ObservedProperties', description: 'Include the related ObservedProperty' },
  ];

export const COMMON_FIELDS: Array<SelectableValue<FilterField>> = [
  { label: 'Name', value: 'name', description: 'Entity name' },
  { label: 'ID', value: '@iot.id', description: 'Entity ID' },
  { label: 'Description', value: 'description', description: 'Entity description' },
];

export const OBSERVATION_FIELDS: Array<SelectableValue<FilterField>> = [
  ...COMMON_FIELDS,
  { label: 'Result', value: 'result', description: 'Observation result value' },
  { label: 'Phenomenon Time', value: 'phenomenonTime', description: 'Time of phenomenon' },
  { label: 'Result Time', value: 'resultTime', description: 'Time of result' },
  { label: 'Feature of Interest', value: 'FeatureOfInterest/@iot.id', description: 'Feature of interest ID' },
];

export const MEASUREMENT_FIELDS: Array<SelectableValue<FilterField>> = [
  { label: 'Unit Name', value: 'unitOfMeasurement/name', description: 'Unit of measurement name' },
  { label: 'Unit Symbol', value: 'unitOfMeasurement/symbol', description: 'Unit of measurement symbol' },
];

export const TEMPORAL_FIELDS: Array<SelectableValue<FilterField>> = [
  { label: 'Phenomenon Time', value: 'phenomenonTime', description: 'Time of phenomenon' },
  { label: 'Result Time', value: 'resultTime', description: 'Time of result' },
];

export const SPATIAL_FIELDS: Array<SelectableValue<FilterField>> = [
  { label: 'Observed Area', value: 'observedArea', description: 'Observed area' },
  { label: 'Location', value: 'location', description: 'Location' },
];

export const FILTER_TYPES: Array<SelectableValue<FilterType>> = [
  { label: 'Basic', value: 'basic', description: 'Filter by basic properties like name or ID' },
  { label: 'Temporal', value: 'temporal', description: 'Filter by time-related properties' },
  { label: 'Measurement', value: 'measurement', description: 'Filter by measurement values or units' },
  { label: 'Spatial', value: 'spatial', description: 'Filter by geographic location' },
  { label: 'Complex', value: 'complex', description: 'Custom OData filter expression' },
];

export const COMPARISON_OPERATORS: Array<SelectableValue<ComparisonOperator>> = [
  { label: 'Equals', value: 'eq', description: 'Equal to' },
  { label: 'Not Equals', value: 'ne', description: 'Not equal to' },
  { label: 'Greater Than', value: 'gt', description: 'Greater than' },
  { label: 'Greater Than or Equal', value: 'ge', description: 'Greater than or equal to' },
  { label: 'Less Than', value: 'lt', description: 'Less than' },
  { label: 'Less Than or Equal', value: 'le', description: 'Less than or equal to' },
];

export const STRING_OPERATORS: Array<SelectableValue<StringOperator>> = [
  { label: 'Starts With', value: 'startswith', description: 'String starts with value' },
  { label: 'Ends With', value: 'endswith', description: 'String ends with value' },
  { label: 'Substring of', value: 'substringof', description: 'String contains value (substringof)' },
];

export const SPATIAL_OPERATORS: Array<SelectableValue<SpatialOperator>> = [
  { label: 'Within', value: 'st_within', description: 'Location is within the specified geometry' },
  { label: 'Intersects', value: 'st_intersects', description: 'Location intersects with the specified geometry' },
  { label: 'Distance', value: 'st_distance', description: 'Distance between location and specified point' },
];

export const TEMPORAL_FUNCTIONS: Array<SelectableValue<TemporalFunction>> = [
  { label: 'Year', value: 'year', description: 'Year component of date' },
  { label: 'Month', value: 'month', description: 'Month component of date' },
  { label: 'Day', value: 'day', description: 'Day component of date' },
  { label: 'Hour', value: 'hour', description: 'Hour component of time' },
  { label: 'Minute', value: 'minute', description: 'Minute component of time' },
  { label: 'Second', value: 'second', description: 'Second component of time' },
];

export const GEOMETRY_TYPES: Array<SelectableValue<string>> = [
  { label: 'Point', value: 'Point', description: 'A single point (x, y)' },
  { label: 'Polygon', value: 'Polygon', description: 'A polygon defined by points' },
  { label: 'LineString', value: 'LineString', description: 'A line defined by points' },
]; 


