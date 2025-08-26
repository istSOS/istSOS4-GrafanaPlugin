import { createDataFrame, FieldType } from '@grafana/data';
import { getTransformedGeometry } from './generic';
import { SensorThingsResponse, IstSOS4Query } from 'types';
import { searchExpandEntity } from 'utils/utils';

function transformFeatureOfInterestWithObservations(feature: any, target: IstSOS4Query) {
  if (!feature || (Array.isArray(feature.Observations) && feature.Observations.length === 0)) {
    return createDataFrame({
      refId: target.refId,
      name: target.alias || 'Feature of Interest',
      fields: [],
    });
  }
  const timeValues: number[] = [];
  const resultValues: any[] = [];
  feature.Observations.forEach((obs: any) => {
    if (obs.phenomenonTime) {
      timeValues.push(new Date(obs.phenomenonTime).getTime());
      resultValues.push(obs.result);
    }
  });

  return createDataFrame({
    refId: target.refId,
    name: target.alias || feature.name || 'Feature of Interest',
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
        config: {
          displayName: feature.name || 'Feature of Interest',
        },
      },
    ],
  });
}

function transformFeatureOfInterests(features: any[], target: IstSOS4Query) {
  const geojsonValues: string[] = [];
  const featureIds: number[] = [];
  const featureNames: string[] = [];
  const featureDescriptions: string[] = [];
  const featureTypes: string[] = [];

  features.forEach((feature: any) => {
    if (feature.feature) {
      let transformedGeometry: any = getTransformedGeometry(feature.feature);
      if (transformedGeometry) {
        geojsonValues.push(JSON.stringify(transformedGeometry));
        featureIds.push(feature['@iot.id']);
        featureNames.push(feature.name || '');
        featureDescriptions.push(feature.description || '');
        featureTypes.push(feature.feature.type || '');
      }
    }
  });

  return createDataFrame({
    refId: target.refId,
    name: target.alias || 'Features of Interest',
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
        name: 'feature_id',
        type: FieldType.number,
        values: featureIds,
        config: {
          displayName: 'Feature ID',
        },
      },
      {
        name: 'feature_name',
        type: FieldType.string,
        values: featureNames,
        config: {
          displayName: 'Feature Name',
        },
      },
      {
        name: 'feature_description',
        type: FieldType.string,
        values: featureDescriptions,
        config: {
          displayName: 'Description',
        },
      },
      {
        name: 'feature_type',
        type: FieldType.string,
        values: featureTypes,
        config: {
          displayName: 'Geometry Type',
        },
      },
    ],
  });
}

export function transformFeatureOfInterest(data: SensorThingsResponse | any, target: IstSOS4Query) {
  if (!data || (Array.isArray(data.value) && data.value.length === 0)) {
    return createDataFrame({
      refId: target.refId,
      name: target.alias || 'Features of Interest',
      fields: [],
    });
  }

  const isSingleFeatureOfInterest = target.entityId !== undefined;
  const FeaturesOfInterest = data.value;

  const hasExpandedObservations =
    target.expand?.some((exp) => exp.entity === 'Observations') ||
    (target.expression && searchExpandEntity(target.expression, 'Observations'));
  if (isSingleFeatureOfInterest && hasExpandedObservations) {
    return transformFeatureOfInterestWithObservations(FeaturesOfInterest[0], target);
  }
  return transformFeatureOfInterests(FeaturesOfInterest, target);
}
