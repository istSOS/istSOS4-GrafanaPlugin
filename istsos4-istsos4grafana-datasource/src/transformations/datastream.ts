import { SensorThingsResponse, IstSOS4Query } from '../types';
import { createDataFrame, DataFrame, FieldType } from '@grafana/data';
import { formatPhenomenonTime, searchExpandEntity } from '../utils/utils';

export function transformDatastreams(data: SensorThingsResponse | any, target: IstSOS4Query): DataFrame | DataFrame[] {
  console.log('Transforming datastreams - entityId:', target.entityId);
  if (!data || (Array.isArray(data.value) && data.value.length === 0)) {
    return createDataFrame({
      refId: target.refId,
      name: target.alias || 'Datastream',
      fields: [],
    });
  }
  const hasExpandedObservations =
    target.expand?.some((exp) => exp.entity === 'Observations') ||
    (target.expression && searchExpandEntity(target.expression, 'Observations'));
  console.log('Processing multiple datastreams');
  const datastreams = data.value;
  if (hasExpandedObservations) {
    console.log('Creating separate DataFrames for each datastream with observations');

    const frames = datastreams
      .filter((ds: any) => ds.Observations && ds.Observations.length > 0)
      .map((ds: any) => {
        const unitOfMeasurement = ds.unitOfMeasurement || {};
        const unitName = unitOfMeasurement.name || 'Unknown';
        const unitSymbol = unitOfMeasurement.symbol || '';
        const datastreamName = ds.name || `Datastream ${ds['@iot.id']}`;

        const timeValues: number[] = [];
        const resultValues: any[] = [];

        ds.Observations.forEach((obs: any) => {
          if (obs.phenomenonTime) {
            timeValues.push(new Date(obs.phenomenonTime).getTime());
            resultValues.push(obs.result);
          }
        });

        console.log(`Datastream ${ds['@iot.id']} has ${timeValues.length} observations`);

        if (timeValues.length === 0) {
          return null;
        }

        return createDataFrame({
          refId: target.refId,
          name: target.alias || datastreamName,
          fields: [
            {
              name: 'time',
              type: FieldType.time,
              values: timeValues,
            },
            {
              name: unitSymbol || 'value',
              type: FieldType.number,
              values: resultValues,
              config: {
                displayName: `${datastreamName} (${unitSymbol})`,
                unit: unitSymbol,
              },
            },
          ],
          meta: {
            custom: {
              datastreamId: ds['@iot.id'],
              datastreamName: datastreamName,
              unitOfMeasurement: {
                name: unitName,
                symbol: unitSymbol,
                definition: unitOfMeasurement.definition || '',
              },
              observationCount: timeValues.length,
              phenomenonTime: ds.phenomenonTime,
              observationType: ds.observationType,
            },
          },
        });
      })
      .filter(Boolean);

    if (frames.length > 0) {
      console.log(`Returning ${frames.length} DataFrames for visualization`);
      return frames;
    }
  }

  // Default behavior for multiple datastreams without observations
  const ids: number[] = [];
  const names: string[] = [];
  const descriptions: string[] = [];
  const units: string[] = [];
  const unitNames: string[] = [];
  const unitDefinitions: string[] = [];
  const phenomenonTimes: string[] = [];

  datastreams.forEach((ds: any) => {
    ids.push(ds['@iot.id']);
    names.push(ds.name || '');
    descriptions.push(ds.description || '');

    const unitOfMeasurement = ds.unitOfMeasurement || {};
    units.push(unitOfMeasurement.symbol || '');
    unitNames.push(unitOfMeasurement.name || '');
    unitDefinitions.push(unitOfMeasurement.definition || '');
    phenomenonTimes.push(formatPhenomenonTime(ds.phenomenonTime));
  });

  return createDataFrame({
    refId: target.refId,
    name: target.alias || 'Datastreams',
    fields: [
      {
        name: 'id',
        type: FieldType.number,
        values: ids,
      },
      {
        name: 'name',
        type: FieldType.string,
        values: names,
      },
      {
        name: 'description',
        type: FieldType.string,
        values: descriptions,
      },
      {
        name: 'unit_symbol',
        type: FieldType.string,
        values: units,
      },
      {
        name: 'unit_name',
        type: FieldType.string,
        values: unitNames,
      },
      {
        name: 'unit_definition',
        type: FieldType.string,
        values: unitDefinitions,
      },
      {
        name: 'phenomenon_time',
        type: FieldType.string,
        values: phenomenonTimes,
        config: {
          displayName: 'Phenomenon Time',
        },
      },
    ],
    meta: {
      custom: {
        expandedEntities: target.expand?.map((exp) => exp.entity) || [],
      },
    },
  });
}
