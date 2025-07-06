import React, { ChangeEvent, useState, useEffect } from 'react';
import { InlineField, Input, Select, Stack, InlineFieldRow, FieldSet, MultiSelect } from '@grafana/ui';
import { QueryEditorProps, SelectableValue } from '@grafana/data';
import { DataSource } from '../datasource';
import { MyDataSourceOptions, IstSOS4Query, EntityType, ExpandOption } from '../types';
import { buildODataQuery } from '../utils/queryBuilder';

type Props = QueryEditorProps<DataSource, IstSOS4Query, MyDataSourceOptions>;

const ENTITY_OPTIONS: Array<SelectableValue<EntityType>> = [
  { label: 'Things', value: 'Things', description: 'Physical or virtual objects' },
  { label: 'Locations', value: 'Locations', description: 'Geographic positions' },
  { label: 'Sensors', value: 'Sensors', description: 'Measurement instruments' },
  { label: 'Observed Properties', value: 'ObservedProperties', description: 'What is being measured' },
  { label: 'Datastreams', value: 'Datastreams', description: 'Links Things, Sensors, and ObservedProperties' },
  { label: 'Observations', value: 'Observations', description: 'Actual measurements' },
  { label: 'Features of Interest', value: 'FeaturesOfInterest', description: 'Real-world features being observed' },
  { label: 'Historical Locations', value: 'HistoricalLocations', description: 'Movement history of Things' },
];

const RESULT_FORMAT_OPTIONS: Array<SelectableValue<string>> = [
  { label: 'Default', value: 'default' },
  { label: 'Data Array', value: 'dataArray' },
];

const THINGS_EXPAND_OPTIONS: Array<SelectableValue<EntityType>> = [
  { label: 'Locations', value: 'Locations', description: 'Include related locations' },
  { label: 'Datastreams', value: 'Datastreams', description: 'Include related datastreams' },
  { label: 'HistoricalLocations', value: 'HistoricalLocations', description: 'Include historical locations' },
];

const DATASTREAMS_EXPAND_OPTIONS: Array<SelectableValue<EntityType>> = [
  { label: 'Observations', value: 'Observations', description: 'Include related observations' },
  { label: 'Thing', value: 'Things', description: 'Include the related Thing' },
  { label: 'Sensor', value: 'Sensors', description: 'Include the related Sensor' },
  { label: 'ObservedProperty', value: 'ObservedProperties', description: 'Include the related ObservedProperty' },
];

  export function QueryEditor({ query, onChange, onRunQuery, datasource }: Props) {
  const [entityOptions, setEntityOptions] = useState<Array<SelectableValue<number>>>([]);
  const [loadingEntities, setLoadingEntities] = useState(false);
  
  const currentQuery: IstSOS4Query = {
    ...query,
    entity: query.entity || 'Things',
    count: query.count || false,
    resultFormat: query.resultFormat || 'default',
  };

  // TODO: Implement Pagination 
  useEffect(() => {
    const fetchEntityNames = async () => {
      if (!currentQuery.entity) return;
      
      setLoadingEntities(true);
      try {
        const fetchQuery: IstSOS4Query = {
          ...currentQuery,
          entityId: undefined,
          select: ['name', '@iot.id'],
          top: 100,
        };
        
        const response = await datasource.query({
          targets: [fetchQuery],
        } as any, false);
        
        if (response.data && response.data.length > 0) {
          const rawEntities = response.data[0].fields.find((field: any) => field.name === 'entities')?.values?.[0] || [];
          const options: Array<SelectableValue<number>> = rawEntities.map((entity: any) => ({
            label: entity.name || `${currentQuery.entity} ${entity['@iot.id']}`,
            value: entity['@iot.id'],
          }));
          
          setEntityOptions(options);
          console.log('Fetched entity names:', options);
        }
      } catch (error) {
        console.error('Error fetching entity names:', error);
        setEntityOptions([]);
      } finally {
        setLoadingEntities(false);
      }
    };

    fetchEntityNames();
  }, [currentQuery.entity, datasource]);

  const onEntityChange = (value: SelectableValue<EntityType>) => {
    onChange({ ...currentQuery, entity: value.value!, entityId: undefined });
  };

  const onEntityNameChange = (value: SelectableValue<number>) => {
    onChange({
      ...currentQuery,
      entityId: value.value,
    });
  };

  const onSelectChange = (event: ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    onChange({
      ...currentQuery,
      select: value ? value.split(',').map((s) => s.trim()) : undefined,
    });
  };

  const onTopChange = (event: ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    onChange({
      ...currentQuery,
      top: value ? parseInt(value, 10) : undefined,
    });
  };

  const onSkipChange = (event: ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    onChange({
      ...currentQuery,
      skip: value ? parseInt(value, 10) : undefined,
    });
  };

  const onResultFormatChange = (value: SelectableValue<string>) => {
    onChange({ ...currentQuery, resultFormat: value.value as 'default' | 'dataArray' });
  };

  const onAliasChange = (event: ChangeEvent<HTMLInputElement>) => {
    onChange({ ...currentQuery, alias: event.target.value });
  };

  const onExpandChange = (values: Array<SelectableValue<EntityType>>) => {
    const expandOptions: ExpandOption[] = values.map(value => ({
      entity: value.value!
    }));
    onChange({ ...currentQuery, expand: expandOptions.length > 0 ? expandOptions : undefined });
  };

  const previewQuery = () => {
    const queryString = buildODataQuery(currentQuery);
    const fullUrl = `/${currentQuery.entity}${currentQuery.entityId ? `(${currentQuery.entityId})` : ''}${queryString}`;
    return fullUrl;
  };

  return (
    <div>
      <Stack gap={1}>
        <FieldSet label="Entity Type">
          <InlineFieldRow>
            <InlineField label="Entity" labelWidth={12} tooltip="Select the SensorThings API entity type">
              <Select
                options={ENTITY_OPTIONS}
                value={ENTITY_OPTIONS.find((opt) => opt.value === currentQuery.entity)}
                onChange={onEntityChange}
                width={20}
              />
            </InlineField>
            <InlineField label="Name" labelWidth={12} tooltip="Select a specific entity by name">
              <Select
                options={entityOptions}
                value={entityOptions.find((opt) => opt.value === currentQuery.entityId)}
                onChange={onEntityNameChange}
                width={20}
                placeholder={loadingEntities ? "Loading..." : "Select entity..."}
                isLoading={loadingEntities}
              />
            </InlineField>
          </InlineFieldRow>          
          {currentQuery.entity === 'Things' && (
            <InlineFieldRow>
              <InlineField label="Expand Entities" labelWidth={12} tooltip="Select related entities to include in the response" grow>
                <MultiSelect
                  options={THINGS_EXPAND_OPTIONS}
                  value={currentQuery.expand?.map(exp => 
                    THINGS_EXPAND_OPTIONS.find(opt => opt.value === exp.entity)
                  ).filter(Boolean) as SelectableValue<EntityType>[] || []}
                  onChange={onExpandChange}
                  placeholder="Select entities to expand..."
                />
              </InlineField>
            </InlineFieldRow>
          )}
          {currentQuery.entity === 'Datastreams' && (
            <InlineFieldRow>
              <InlineField label="Expand Entities" labelWidth={12} tooltip="Select related entities to include in the response" grow>
                <MultiSelect
                  options={DATASTREAMS_EXPAND_OPTIONS}
                  value={currentQuery.expand?.map(exp => 
                    DATASTREAMS_EXPAND_OPTIONS.find(opt => opt.value === exp.entity)
                  ).filter(Boolean) as SelectableValue<EntityType>[] || []}
                  onChange={onExpandChange}
                  placeholder="Select entities to expand..."
                />
              </InlineField>
            </InlineFieldRow>
          )}
          
          <div style={{ height: '10x' }} />
          <InlineFieldRow>
            <InlineField label="Alias" labelWidth={12} tooltip="Display name for this query">
              <Input value={currentQuery.alias || ''} onChange={onAliasChange} width={20} placeholder="Query alias" />
            </InlineField>
            <InlineField label="Result Format" labelWidth={16} tooltip="Format of the response">
              <Select
                options={RESULT_FORMAT_OPTIONS}
                value={RESULT_FORMAT_OPTIONS.find((opt) => opt.value === currentQuery.resultFormat)}
                onChange={onResultFormatChange}
                width={15}
              />
            </InlineField>
          </InlineFieldRow>
        </FieldSet>
        
        {/* Advanced Options */}
        <FieldSet label="Advanced Options">
          <InlineFieldRow>
            <InlineField label="$select" labelWidth={12} tooltip="Comma-separated list of properties to return" grow>
              <Input
                value={currentQuery.select?.join(', ') || ''}
                onChange={onSelectChange}
                placeholder="e.g., name, description, @iot.id"
              />
            </InlineField>
          </InlineFieldRow>

          <InlineFieldRow>
            <InlineField label="$top" labelWidth={12} tooltip="Limit number of results">
              <Input
                value={currentQuery.top || ''}
                onChange={onTopChange}
                width={10}
                type="number"
                placeholder="e.g., 100"
              />
            </InlineField>
            <InlineField label="$skip" labelWidth={12} tooltip="Skip number of results">
              <Input
                value={currentQuery.skip || ''}
                onChange={onSkipChange}
                width={10}
                type="number"
                placeholder="e.g., 0"
              />
            </InlineField>
          </InlineFieldRow>
        </FieldSet>
      </Stack>
      <div style={{ width: '100%' }}>
        <FieldSet label="Query Preview">
          <div
            style={{
              padding: '8px',
              backgroundColor: '#1f1f1f',
              borderRadius: '4px',
              fontFamily: 'monospace',
              fontSize: '14px',
              color: '#ffffff',
              border: '1px solid #333',
              maxHeight: '120px',
              overflowY: 'auto',
              overflowX: 'auto',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              lineHeight: '1.4',
              width: '100%',
              boxSizing: 'border-box'
            }}
          >
            {previewQuery()}
          </div>
        </FieldSet>
      </div>
    </div>
  );
}