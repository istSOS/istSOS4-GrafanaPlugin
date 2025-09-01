import { IstSOS4Query, SensorThingsResponse } from 'types';
import { createDataFrame, FieldType } from '@grafana/data';
import { getTransformedGeometry } from './generic';

export function transformHistoricalLocations(data: SensorThingsResponse | any, target: IstSOS4Query) {
  const geojsonValues: string[] = [];
  const locationIds: number[] = [];
  const locationTypes: string[] = [];
  const timeValues: number[] = [];

  const historicalLocations = data.value;
  historicalLocations.forEach((histLoc: any) => {
    if (histLoc.Locations && histLoc.Locations.length > 0) {
      histLoc.Locations.forEach((location: any) => {
        const transformedGeometry = getTransformedGeometry(location.location);
        if (transformedGeometry) {
          geojsonValues.push(JSON.stringify(transformedGeometry));
          locationIds.push(histLoc['@iot.id']);
          locationTypes.push(location.location.type);
          timeValues.push(new Date(histLoc.time).getTime());
        }
      });
    } else {
      locationIds.push(histLoc['@iot.id']);
      timeValues.push(new Date(histLoc.time).getTime());
    }
  });

  const fields: any[] = [
    {
      name: 'location_id',
      type: FieldType.number,
      values: locationIds,
      config: {
        displayName: 'Location ID',
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
  ];

  if (geojsonValues.length > 0) {
    fields.unshift({
      name: 'geojson',
      type: FieldType.string,
      values: geojsonValues,
      config: {
        displayName: 'Geometry',
      },
    });
  }

  if (locationTypes.length > 0) {
    fields.push({
      name: 'location_type',
      type: FieldType.string,
      values: locationTypes,
      config: {
        displayName: 'Geometry Type',
      },
    });
  }

  return createDataFrame({
    refId: target.refId,
    name: target.alias || 'Historical Locations',
    fields,
  });
}
