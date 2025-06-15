import React, { ChangeEvent } from 'react';
import { InlineField, Input, Select, TextArea, Stack, InlineFieldRow, Button, FieldSet } from '@grafana/ui';
import { QueryEditorProps, SelectableValue } from '@grafana/data';
import { DataSource } from '../datasource';
import { MyDataSourceOptions, IstSOS4Query, EntityType } from '../types';
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

  export function QueryEditor({ query, onChange, onRunQuery }: Props) {
  const currentQuery: IstSOS4Query = {
    ...query,
    entity: query.entity || 'Things',
    count: query.count || false,
    resultFormat: query.resultFormat || 'default',
  };

  const onEntityChange = (value: SelectableValue<EntityType>) => {
    onChange({ ...currentQuery, entity: value.value! });
  };

  const onEntityIdChange = (event: ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    onChange({
      ...currentQuery,
      entityId: value ? parseInt(value, 10) : undefined,
    });
  };

  const onFilterChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
    onChange({ ...currentQuery, filter: event.target.value });
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

  const previewQuery = () => {
    const queryString = buildODataQuery(currentQuery);
    const fullUrl = `/${currentQuery.entity}${currentQuery.entityId ? `(${currentQuery.entityId})` : ''}${queryString}`;
    return fullUrl;
  };

  const insertFilterExample = (example: string) => {
    const currentFilter = currentQuery.filter || '';
    const newFilter = currentFilter ? `${currentFilter} and ${example}` : example;
    onChange({ ...currentQuery, filter: newFilter });
  };

  return (
    <div>
      <Stack gap={1}>
        {/*
        Basic Query
        */}
        <FieldSet label="Basic Query">
          <InlineFieldRow>
            <InlineField label="Entity" labelWidth={12} tooltip="Select the SensorThings API entity type">
              <Select
                options={ENTITY_OPTIONS}
                value={ENTITY_OPTIONS.find((opt) => opt.value === currentQuery.entity)}
                onChange={onEntityChange}
                width={20}
              />
            </InlineField>
            <InlineField label="Entity ID" labelWidth={12} tooltip="Optional: Specify a specific entity ID">
              <Input
                value={currentQuery.entityId || ''}
                onChange={onEntityIdChange}
                width={10}
                type="number"
                placeholder="Optional"
              />
            </InlineField>
          </InlineFieldRow>
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
        <FieldSet label="Filter">
          <InlineFieldRow>
            <InlineField label="$filter" labelWidth={12} tooltip="OData filter expression" grow>
              <TextArea
                value={currentQuery.filter || ''}
                onChange={onFilterChange}
                rows={3}
                placeholder="e.g., name eq 'Temperature Sensor' or @iot.id gt 10"
              />
            </InlineField>
          </InlineFieldRow>

          <InlineFieldRow>
            <Stack direction="row" gap={1}>
              <Button size="sm" variant="secondary" onClick={() => insertFilterExample("name eq 'example'")}>
                Name Equals
              </Button>
              <Button size="sm" variant="secondary" onClick={() => insertFilterExample('@iot.id gt 0')}>
                ID Greater Than
              </Button>
              <Button size="sm" variant="secondary" onClick={() => insertFilterExample("contains(name,'temp')")}>
                Name Contains
              </Button>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => insertFilterExample('phenomenonTime ge 2023-01-01T00:00:00Z')}
              >
                Time After
              </Button>
            </Stack>
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

        {/* Query Preview */}
        <FieldSet label="Query Preview">
          <div
            style={{
              padding: 8,
              backgroundColor: 'black       ',
              borderRadius: 4,
              fontFamily: 'monospace',
              fontSize: '12px',
              wordBreak: 'break-all',
            }}
          >
            {previewQuery()}
          </div>
        </FieldSet>
        <InlineFieldRow>
          <Button onClick={onRunQuery} variant="primary">
            Run Query
          </Button>
        </InlineFieldRow>
      </Stack>
    </div>
  );
}
