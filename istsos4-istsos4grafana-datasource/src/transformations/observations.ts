import { createDataFrame, FieldType } from '@grafana/data';
import { SensorThingsResponse, IstSOS4Query } from 'types';
import { searchExpandEntity } from 'utils/utils';
export function transformObservations(data: SensorThingsResponse, target: IstSOS4Query) {
  if (!data || (Array.isArray(data.value) && data.value.length === 0)) {
    return createDataFrame({
      refId: target.refId,
      name: target.alias || 'Observations',
      fields: [],
    });
  }
  const hasExpandedDatastreams =
    target.expand?.some((exp) => exp.entity === 'Datastreams') ||
    (target.expression && searchExpandEntity(target.expression, 'Datastreams'));
  const observations: any[] = data.value;
  console.log("Here", observations);
  if(hasExpandedDatastreams)  {
    return transformObservationswithDatastreams(observations, target);
  }
  return transformBasicObservations(observations, target);
}

export function transformObservationswithDatastreams(observations: any, target: IstSOS4Query) {
   const Ids: number[] = [];
    const datastreamIds: number[] = [];
    const datastreamNames: string[] = [];
    const datastreamDescriptions: string[] = [];
    const datastreamResultTimes: string[] = [];
    observations.forEach((entity: any) => {
      if (entity.Datastream) {
        const datastream = entity.Datastream;
        Ids.push(entity['@iot.id']);
        datastreamIds.push(datastream['@iot.id']);
        datastreamNames.push(datastream.name || '');
        datastreamDescriptions.push(datastream.description || '');
        datastreamResultTimes.push(datastream.resultTime || '');
      }
    });
  
    return createDataFrame({
      refId: target.refId,
      name: target.alias || 'Observations Datastreams',
      fields: [
        {
          name: `observation_id`,
          type: FieldType.number,
          values: Ids,
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


export function transformBasicObservations(observations: any[], target: IstSOS4Query) {
  const timeValues: number[] = [];
  const resultValues: any[] = [];
  observations.forEach((obs: any) => {
    if (obs.phenomenonTime) {
      timeValues.push(new Date(obs.phenomenonTime).getTime());
      resultValues.push(obs.result);
    }
  });

  return createDataFrame({
    refId: target.refId,
    name: target.alias || 'Observations',
    fields: [
      {
        name: 'time',
        type: FieldType.time,
        values: timeValues,
      },
      {
        name: 'value',
        type: FieldType.number,
        values: resultValues,
      },
    ],
  });
}
