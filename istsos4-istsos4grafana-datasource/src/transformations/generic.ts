import { createDataFrame, FieldType } from '@grafana/data';
import { IstSOS4Query } from 'types';
import { getSingularEntityName, convertEPSG2056ToWGS84 } from 'utils/utils';
export function transformEntityWithDatastreams(entities: any[], target: IstSOS4Query) {
  const Ids: number[] = [];
  const Names: string[] = [];
  const Descriptions: string[] = [];
  const datastreamIds: number[] = [];
  const datastreamNames: string[] = [];
  const datastreamDescriptions: string[] = [];
  const datastreamResultTimes: string[] = [];
  const type =
    getSingularEntityName(target.entity).charAt(0).toLowerCase() + getSingularEntityName(target.entity).slice(1);
  entities.forEach((entity: any) => {
    if (entity.Datastreams && entity.Datastreams.length > 0) {
      entity.Datastreams.forEach((datastream: any) => {
        Ids.push(entity['@iot.id']);
        Names.push(entity.name || '');
        Descriptions.push(entity.description || '');
        datastreamIds.push(datastream['@iot.id']);
        datastreamNames.push(datastream.name || '');
        datastreamDescriptions.push(datastream.description || '');
        datastreamResultTimes.push(datastream.resultTime || '');
      });
    }
  });

  return createDataFrame({
    refId: target.refId,
    name: target.alias || `${type.charAt(0).toUpperCase() + type.slice(1)}s Datastreams`,
    fields: [
      {
        name: `${type}_id`,
        type: FieldType.number,
        values: Ids,
      },
      {
        name: `${type}_name`,
        type: FieldType.string,
        values: Names,
      },
      {
        name: `${type}_description`,
        type: FieldType.string,
        values: Descriptions,
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

export function transformBasicEntity(data: any[], target: IstSOS4Query) {
  const Ids: number[] = [];
  const Names: string[] = [];
  const Descriptions: string[] = [];
  const type =
    getSingularEntityName(target.entity).charAt(0).toLowerCase() + getSingularEntityName(target.entity).slice(1);

  data.forEach((thing: any) => {
    Ids.push(thing['@iot.id']);
    Names.push(thing.name || '');
    Descriptions.push(thing.description || '');
  });

  return createDataFrame({
    refId: target.refId,
    name: target.alias || `${type.charAt(0).toUpperCase() + type.slice(1)}s`,
    fields: [
      {
        name: `${type}_id`,
        type: FieldType.number,
        values: Ids,
      },
      {
        name: `${type}_name`,
        type: FieldType.string,
        values: Names,
      },
      {
        name: `${type}_description`,
        type: FieldType.string,
        values: Descriptions,
      },
    ],
  });
}

export function getTransformedGeometry(location: any): any {
  let transformedGeometry;
  switch (location.type) {
    case 'Point':
      const coords = location.coordinates;
      const [lon, lat] = convertEPSG2056ToWGS84(coords[0], coords[1]);
      transformedGeometry = {
        type: 'Point',
        coordinates: [lon, lat],
      };
      break;
    case 'Polygon':
      const transformedCoordinates = location.coordinates.map((ring: number[][]) =>
        ring.map((coord: number[]) => {
          const [lon, lat] = convertEPSG2056ToWGS84(coord[0], coord[1]);
          return [lon, lat];
        })
      );
      transformedGeometry = {
        type: 'Polygon',
        coordinates: transformedCoordinates,
      };
      break;

    case 'LineString':
      const transformedLineCoords = location.coordinates.map((coord: number[]) => {
        const [lon, lat] = convertEPSG2056ToWGS84(coord[0], coord[1]);
        return [lon, lat];
      });
      transformedGeometry = {
        type: 'LineString',
        coordinates: transformedLineCoords,
      };
      break;
    default:
      console.warn(`Unsupported geometry type: ${location.type}`);
      return;
  }
  return transformedGeometry;
}
