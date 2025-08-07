import { IstSOS4Query, SensorThingsResponse } from 'types';
import { createDataFrame, FieldType } from '@grafana/data';
import { getTransformedGeometry } from './generic';

export function transformHistoricalLocations(data: SensorThingsResponse | any, target: IstSOS4Query) {
  const geojsonValues: string[] = [];
  const locationIds: number[] = [];
  const locationNames: string[] = [];
  const locationDescriptions: string[] = [];
  const locationTypes: string[] = [];
  const timeValues: number[] = [];

  const isSingleLocation = target.entityId !== undefined;
  const historicalLocations = isSingleLocation ? [data] : data.value;

  historicalLocations.forEach((histLoc: any) => {
    if (histLoc.Locations && histLoc.Locations.length > 0) {
      histLoc.Locations.forEach((location: any) => {
        const transformedGeometry = getTransformedGeometry(location);
        if (transformedGeometry) {
          geojsonValues.push(JSON.stringify(transformedGeometry));
          locationIds.push(histLoc['@iot.id']);
          locationNames.push(histLoc.name || '');
          locationDescriptions.push(histLoc.description || '');
          locationTypes.push(location.location.type);
          timeValues.push(new Date(histLoc.time).getTime());
        }
      });
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
      {
        name: 'time',
        type: FieldType.time,
        values: timeValues,
        config: {
          displayName: 'Time',
        },
      },
    ],
  });
}
