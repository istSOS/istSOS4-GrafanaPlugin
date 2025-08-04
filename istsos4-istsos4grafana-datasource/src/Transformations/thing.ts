import { SensorThingsResponse, IstSOS4Query } from 'types';
import { createDataFrame } from '@grafana/data';
import { convertEPSG2056ToWGS84 } from '../utils/utils';
import { FieldType } from '@grafana/data';

function transformThingsWithDatastreams(things: any[], target: IstSOS4Query) {
  const thingIds: number[] = [];
  const thingNames: string[] = [];
  const thingDescriptions: string[] = [];
  const datastreamIds: number[] = [];
  const datastreamNames: string[] = [];
  const datastreamDescriptions: string[] = [];
  const datastreamResultTimes: string[] = [];

  things.forEach((thing: any) => {
    if (thing.Datastreams && thing.Datastreams.length > 0) {
      thing.Datastreams.forEach((datastream: any) => {
        thingIds.push(thing['@iot.id']);
        thingNames.push(thing.name || '');
        thingDescriptions.push(thing.description || '');
        datastreamIds.push(datastream['@iot.id']);
        datastreamNames.push(datastream.name || '');
        datastreamDescriptions.push(datastream.description || '');
        datastreamResultTimes.push(datastream.resultTime || '');
      });
    }
  });

  return createDataFrame({
    refId: target.refId,
    name: target.alias || 'Things Datastreams',
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
        name: 'datastream_id',
        type: FieldType.number,
        values: datastreamIds,
      },
      {
        name: 'datastream_name',
        type: FieldType.string,
        values: datastreamNames,
      },
      {
        name: 'datastream_description',
        type: FieldType.string,
        values: datastreamDescriptions,
      },
      {
        name: 'datastream_resultTime',
        type: FieldType.string,
        values: datastreamResultTimes,
      },
    ],
  });
}

function transformThingsWithLocations(things: any[], target: IstSOS4Query) {
  const latValues: number[] = [];
  const lonValues: number[] = [];
  const locationNames: string[] = [];
  const locationDescriptions: string[] = [];
  const thingIds: number[] = [];
  const thingNames: string[] = [];
  const thingDescriptions: string[] = [];

  things.forEach((thing: any) => {
    if (thing.Locations && thing.Locations.length > 0) {
      thing.Locations.forEach((location: any) => {
        thingIds.push(thing['@iot.id']);
        thingNames.push(thing.name || '');
        thingDescriptions.push(thing.description || '');
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

  return createDataFrame({
    refId: target.refId,
    name: target.alias || 'Things Locations',
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
        name: 'location_name',
        type: FieldType.string,
        values: locationNames,
      },
      {
        name: 'location_description',
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
        if (histLoc.time && histLoc.Locations && histLoc.Locations.length > 0) {
          const location = histLoc.Locations[0];

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

function transformThingsBasic(things: any[], target: IstSOS4Query) {
  const thingIds: number[] = [];
  const thingNames: string[] = [];
  const thingDescriptions: string[] = [];

  things.forEach((thing: any) => {
    thingIds.push(thing['@iot.id']);
    thingNames.push(thing.name || '');
    thingDescriptions.push(thing.description || '');
  });

  return createDataFrame({
    refId: target.refId,
    name: target.alias || 'Things',
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
    ],
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

  if (hasExpandedDatastreams) return transformThingsWithDatastreams(things, target);
  if (hasExpandedLocations) return transformThingsWithLocations(things, target);
  if (hasExpandedHistoricalLocations) return transformThingsWithHistoricalLocations(things, target);
  return transformThingsBasic(things, target);
}
