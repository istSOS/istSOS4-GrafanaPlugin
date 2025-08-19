import { SensorThingsResponse, IstSOS4Query } from 'types';
import { createDataFrame } from '@grafana/data';
import { transformBasicEntity, transformEntityWithDatastreams } from './generic';

export function transformObservedProperties(data: SensorThingsResponse | any, target: IstSOS4Query) {
  if (!data || (Array.isArray(data.value) && data.value.length === 0)) {
    return createDataFrame({
      refId: target.refId,
      name: target.alias || 'Observed Properties',
      fields: [],
    });
  }
  const isSingleObservedProperty = target.entityId !== undefined;
  const ObservedProperties = isSingleObservedProperty ? [data] : data.value;

  const hasExpandedDatastreams = target.expand?.some((exp) => exp.entity === 'Datastreams');

  if (hasExpandedDatastreams) return transformEntityWithDatastreams(ObservedProperties, target);
  return transformBasicEntity(ObservedProperties, target);
}
