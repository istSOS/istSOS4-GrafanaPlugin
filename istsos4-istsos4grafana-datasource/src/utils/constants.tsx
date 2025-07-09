import { SelectableValue } from "@grafana/data";
import { EntityType } from "types";
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