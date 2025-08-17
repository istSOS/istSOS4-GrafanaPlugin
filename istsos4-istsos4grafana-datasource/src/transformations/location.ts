

import { IstSOS4Query, SensorThingsResponse } from 'types';
import { createDataFrame, FieldType } from '@grafana/data';
import { getTransformedGeometry } from './generic';

export function transformLocations(data: SensorThingsResponse | any, target: IstSOS4Query) {
  const geojsonValues: string[] = [];
  const locationIds: number[] = [];
  const locationNames: string[] = [];
  const locationDescriptions: string[] = [];
  const locationTypes: string[] = [];

  const isSingleLocation = target.entityId !== undefined;
  const locations = isSingleLocation ? [data] : data.value;

  locations.forEach((location: any) => {
    let transformedGeometry: any = getTransformedGeometry(location.location);
    if (transformedGeometry) {
      geojsonValues.push(JSON.stringify(transformedGeometry));
      locationIds.push(location['@iot.id']);
      locationNames.push(location.name || '');
      locationDescriptions.push(location.description || '');
      locationTypes.push(location.location.type);
    }
  });

  return createDataFrame({
    refId: target.refId,
    name: target.alias || 'Locations',
    fields: [
      {
        name: 'geojson',
        type: FieldType.string,
        values: geojsonValues,
        config: {
          displayName: 'Geometry',
        },
      },
      {
        name: 'location_id',
        type: FieldType.number,
        values: locationIds,
        config: {
          displayName: 'Location ID',
        },
      },
      {
        name: 'location_name',
        type: FieldType.string,
        values: locationNames,
        config: {
          displayName: 'Location Name',
        },
      },
      {
        name: 'location_description',
        type: FieldType.string,
        values: locationDescriptions,
        config: {
          displayName: 'Description',
        },
      },
      {
        name: 'location_type',
        type: FieldType.string,
        values: locationTypes,
        config: {
          displayName: 'Geometry Type',
        },
      },
    ],
  });
}