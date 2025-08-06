import { SensorThingsResponse, IstSOS4Query } from 'types';
import { createDataFrame } from '@grafana/data';
import { convertEPSG2056ToWGS84 } from '../utils/utils';
import { FieldType } from '@grafana/data';
import { transformBasicEntity, transformEntityWithDatastreams } from './generic';
function transformThingsWithLocations(things: any[], target: IstSOS4Query) {
  const geojsonValues: string[] = [];
  const thingIds: number[] = [];
  const thingNames: string[] = [];
  const thingDescriptions: string[] = [];
  const locationNames: string[] = [];
  const locationTypes: string[] = [];
  const values: number[] = [];

  console.log('Transforming Things with Locations:', things);

  things.forEach((thing: any, index: number) => {
    if (thing.Locations && thing.Locations.length > 0) {
      thing.Locations.forEach((location: any) => {
        let transformedGeometry: any = null;

        switch (location.location.type) {
          case 'Point':
            const coords = location.location.coordinates;
            const [lon, lat] = convertEPSG2056ToWGS84(coords[0], coords[1]);
            transformedGeometry = {
              type: 'Point',
              coordinates: [lon, lat]
            };
            break;
          case 'Polygon':
            const transformedCoordinates = location.location.coordinates.map((ring: number[][]) => 
              ring.map((coord: number[]) => {
                const [lon, lat] = convertEPSG2056ToWGS84(coord[0], coord[1]);
                return [lon, lat];
              })
            );
            transformedGeometry = {
              type: 'Polygon',
              coordinates: transformedCoordinates
            };
            break;

          case 'LineString':
            const transformedLineCoords = location.location.coordinates.map((coord: number[]) => {
              const [lon, lat] = convertEPSG2056ToWGS84(coord[0], coord[1]);
              return [lon, lat];
            });
            transformedGeometry = {
              type: 'LineString',
              coordinates: transformedLineCoords
            };
            break;
          default:
            console.warn(`Unsupported geometry type: ${location.location.type}`);
            return;
        }

        if (transformedGeometry) {
          geojsonValues.push(JSON.stringify(transformedGeometry));
          thingIds.push(thing['@iot.id']);
          thingNames.push(thing.name || '');
          thingDescriptions.push(thing.description || '');
          locationNames.push(location.name || '');
          locationTypes.push(location.location.type);
          values.push(index + 1);
        }
      });
    }
  });

  return createDataFrame({
    refId: target.refId,
    name: target.alias || 'Things with Polygons',
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
        name: 'thing_id',
        type: FieldType.number,
        values: thingIds,
        config: {
          displayName: 'Thing ID',
        },
      },
      {
        name: 'thing_name',
        type: FieldType.string,
        values: thingNames,
        config: {
          displayName: 'Thing Name',
        },
      },
      {
        name: 'thing_description',
        type: FieldType.string,
        values: thingDescriptions,
        config: {
          displayName: 'Description',
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
        name: 'location_type',
        type: FieldType.string,
        values: locationTypes,
        config: {
          displayName: 'Geometry Type',
        },
      },
      {
        name: 'value',
        type: FieldType.number,
        values: values,
        config: {
          displayName: 'Value',
        },
      },
    ],
  });
}

function transformThingsWithHistoricalLocations(things: any[], target: IstSOS4Query) {
  const timeValues: number[] = [];
  const latValues: number[] = [];
  const lonValues: number[] = [];
  const locationNames: string[] = [];
  const locationDescriptions: string[] = [];
  const thingIds: number[] = [];
  const thingNames: string[] = [];
  const thingDescriptions: string[] = [];

  things.forEach((thing: any) => {
    if (thing.HistoricalLocations && thing.HistoricalLocations.length > 0) {
      thing.HistoricalLocations.forEach((histLoc: any) => {
        if (histLoc.Locations && histLoc.Locations.length > 0) {
            histLoc.Locations.forEach((location: any) => {
            thingIds.push(thing['@iot.id']);
            thingNames.push(thing.name || '');
            thingDescriptions.push(thing.description || '');
            timeValues.push(new Date(histLoc.time).getTime());
            locationNames.push(location.name || '');
            locationDescriptions.push(location.description || '');
            const coords = location.location.coordinates;
            const x = coords[0];
            const y = coords[1];
            const [lon, lat] = convertEPSG2056ToWGS84(x, y);
            lonValues.push(lon);
            latValues.push(lat);
        });
      }
    });
  }
});

  return createDataFrame({
    refId: target.refId,
    name: target.alias || 'Things Historical Locations',
    fields: [
      {
        name: 'thing_id',
        type: FieldType.number,
        values: thingIds,
      },
      {
        name: 'thing_name',
        type: FieldType.string,
        values: thingNames,
      },
      {
        name: 'thing_description',
        type: FieldType.string,
        values: thingDescriptions,
      },
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
        name: 'historical_location_name',
        type: FieldType.string,
        values: locationNames,
      },
      {
        name: 'historical_location_description',
        type: FieldType.string,
        values: locationDescriptions,
      },
    ],
    meta: {
      custom: {
        isGeospatialData: true,
      },
    },
  });
}

export function transformThings(data: SensorThingsResponse | any, target: IstSOS4Query) {
  if (!data || (Array.isArray(data.value) && data.value.length === 0)) {
    return createDataFrame({
      refId: target.refId,
      name: target.alias || 'Things',
      fields: [],
    });
  }
  const isSingleThing = target.entityId !== undefined;
  const things = isSingleThing ? [data] : data.value;

  const hasExpandedDatastreams = target.expand?.some((exp) => exp.entity === 'Datastreams');
  const hasExpandedLocations = target.expand?.some((exp) => exp.entity === 'Locations');
  const hasExpandedHistoricalLocations = target.expand?.some((exp) => exp.entity === 'HistoricalLocations');

  if (hasExpandedDatastreams) return transformEntityWithDatastreams(things, target);
  if (hasExpandedLocations) return transformThingsWithLocations(things, target);
  if (hasExpandedHistoricalLocations) return transformThingsWithHistoricalLocations(things, target);
  return transformBasicEntity(things, target);
}
