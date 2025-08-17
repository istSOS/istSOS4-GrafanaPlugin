import { createDataFrame, FieldType } from '@grafana/data';
import { SensorThingsResponse, IstSOS4Query } from 'types';
export function transformObservations(data: SensorThingsResponse, target: IstSOS4Query) {
  if (!data || (Array.isArray(data.value) && data.value.length === 0)) {
    return createDataFrame({
      refId: target.refId,
      name: target.alias || 'Observations',
      fields: [],
    });
  }
  const isSingleObservation = target.entityId !== undefined;
  const observations = isSingleObservation ? [data] : data.value;

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
