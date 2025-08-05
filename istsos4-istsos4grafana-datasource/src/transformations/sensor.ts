import { SensorThingsResponse, IstSOS4Query } from 'types';
import { createDataFrame } from '@grafana/data';
import { transformBasicEntity, transformEntityWithDatastreams } from './generic';

export function transformSensors(data: SensorThingsResponse | any, target: IstSOS4Query) {
  if (!data || (Array.isArray(data.value) && data.value.length === 0)) {
    return createDataFrame({
      refId: target.refId,
      name: target.alias || 'Sensors',
      fields: [],
    });
  }
  const isSingleSensor = target.entityId !== undefined;
  const sensors = isSingleSensor ? [data] : data.value;

  const hasExpandedDatastreams = target.expand?.some((exp) => exp.entity === 'Datastreams');

  if (hasExpandedDatastreams) return transformEntityWithDatastreams(sensors, target);
  return transformBasicEntity(sensors, target);
}
