import React, { ChangeEvent, useState } from 'react';
import {
  InlineField,
  Input,
  Select,
  Stack,
  InlineFieldRow,
  FieldSet,
  MultiSelect,
  Button,
  useStyles2,
  Collapse,
} from '@grafana/ui';
import { QueryEditorProps, SelectableValue } from '@grafana/data';
import { DataSource } from '../datasource';
import { MyDataSourceOptions, IstSOS4Query, EntityType, ExpandOption, FilterCondition } from '../types';
import { buildODataQuery } from '../utils/queryBuilder';
import { FilterPanel } from './FilterPanel';
import { VariablesPanel } from './VariablesPanel';
import {
  ENTITY_OPTIONS,
  THINGS_EXPAND_OPTIONS,
  DATASTREAMS_EXPAND_OPTIONS,
  RESULT_FORMAT_OPTIONS,
} from '../utils/constants';
import { compareEntityNames, getStyles } from '../utils/utils';

type Props = QueryEditorProps<DataSource, IstSOS4Query, MyDataSourceOptions>;

interface Entity {
  '@iot.id': number;
  name?: string;
  description?: string;
}

export function QueryEditor({ query, onChange, onRunQuery, datasource }: Props) {
  const [searchQuery, setSearchQuery] = useState('');
  const [entityList, setEntityList] = useState<Entity[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [showVariables, setShowVariables] = useState(false);

  const styles = useStyles2(getStyles);

  const currentQuery: IstSOS4Query = {
    ...query,
    entity: query.entity || 'Things',
    count: query.count || false,
    resultFormat: query.resultFormat || 'default',
    filters: query.filters || [],
  };

  const onEntityChange = (value: SelectableValue<EntityType>) => {
    const newQuery = { ...currentQuery, entity: value.value!, entityId: undefined };

    // Auto Expanstions when the Entity is changed
    // Currently Datastreams only
    if (value.value === 'Datastreams') {
      newQuery.expand = newQuery.expand || [];
      if (!newQuery.expand.some((exp) => exp.entity === 'Observations')) {
        newQuery.expand.push({ entity: 'Observations' });
      }

      // Move any Observation filters to the Observations expansion if they exist
      // if (newQuery.filters && newQuery.filters.length > 0) {
      //   const observationFilters = newQuery.filters.filter(f => f.type === 'Observation');
      //   const otherFilters = newQuery.filters.filter(f => f.type !== 'Observation');

      //   if (observationFilters.length > 0) {
      //     // Keep only non-Observation filters in the main filters array
      //     newQuery.filters = otherFilters;
      //   }
      // }
    }

    onChange(newQuery);
  };

  const onEntityIdChange = (event: ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    onChange({
      ...currentQuery,
      entityId: value ? parseInt(value, 10) : undefined,
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
    const expandOptions: ExpandOption[] = values.map((value) => ({
      entity: value.value!,
    }));
    onChange({ ...currentQuery, expand: expandOptions.length > 0 ? expandOptions : undefined });
  };

  const onFiltersChange = (filters: FilterCondition[]) => {
    const currentFilters = currentQuery.filters || [];
    const hadObservationFilters = currentFilters.some((f) => f.type === 'Observation');
    const hasObservationFilters = filters.some((f) => f.type === 'Observation');

    // If we're removing all Observation filters and the entity is Datastreams
    if (hadObservationFilters && !hasObservationFilters && currentQuery.entity === 'Datastreams') {
      // Find and update the Observations expand to remove any filter
      const newExpand = currentQuery.expand?.map((exp) => {
        if (exp.entity === 'Observations' && exp.subQuery?.filter) {
          const newSubQuery = { ...exp.subQuery };
          delete newSubQuery.filter;
          return { ...exp, subQuery: Object.keys(newSubQuery).length > 0 ? newSubQuery : undefined };
        }
        return exp;
      });
      onChange({ ...currentQuery, filters, expand: newExpand });
    } else {
      onChange({ ...currentQuery, filters });
    }
  };

  const previewQuery = () => {
    const queryString = buildODataQuery(currentQuery,false);
    let fullUrl = `/${currentQuery.entity}`;
    const variableFilters = (currentQuery.filters || []).filter(f => f.type === 'variable');
    const matchingVariable = variableFilters.find(vf => compareEntityNames(vf.entity, currentQuery.entity));
    if (matchingVariable) {
      fullUrl += `(\$${(matchingVariable as any).variableName})`;
    } else if (currentQuery.entityId !== undefined) {
      fullUrl += `(${currentQuery.entityId})`;  
    }
    fullUrl += queryString;
    return fullUrl;
  };

  const handleSearchChange = (event: ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(event.target.value);
  };

  const fetchEntities = async () => {
    if (!currentQuery.entity) return;

    setIsLoading(true);
    try {
      const fetchQuery: IstSOS4Query = {
        ...currentQuery,
        entityId: undefined,
        select: ['name', 'description', '@iot.id'],
        top: 100,
        refId: 'entities',
      };

      const response = await datasource.query(
        {
          targets: [fetchQuery],
        } as any,
        false
      );

      if (response.data && response.data.length > 0 && response.data[0].meta?.custom?.rawResponse) {
        const rawResponse = response.data[0].meta.custom.rawResponse;
        if (rawResponse.value && Array.isArray(rawResponse.value)) {
          setEntityList(rawResponse.value);
          console.log('Fetched entities:', rawResponse.value);
        }
      } else {
        setEntityList([]);
      }
    } catch (error) {
      console.error('Error fetching entities:', error);
      setEntityList([]);
    } finally {
      setIsLoading(false);
    }
  };

  const selectEntity = (entityId: number) => {
    onChange({
      ...currentQuery,
      entityId,
    });
  };

  const filteredEntities = entityList.filter((entity) => {
    if (!searchQuery) return true;

    const id = entity['@iot.id']?.toString().toLowerCase() || '';
    const name = entity.name?.toLowerCase() || '';
    const description = entity.description?.toLowerCase() || '';
    const query = searchQuery.toLowerCase();

    return id.includes(query) || name.includes(query) || description.includes(query);
  });

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
            <InlineField label="Entity ID" labelWidth={12} tooltip="Enter a specific entity ID">
              <Input
                value={currentQuery.entityId || ''}
                onChange={onEntityIdChange}
                width={20}
                type="number"
                placeholder="Enter entity ID"
              />
            </InlineField>
          </InlineFieldRow>
          {currentQuery.entity === 'Things' && (
            <InlineFieldRow>
              <InlineField
                label="Expand Entities"
                labelWidth={12}
                tooltip="Select related entities to include in the response"
                grow
              >
                <MultiSelect
                  options={THINGS_EXPAND_OPTIONS}
                  value={
                    (currentQuery.expand
                      ?.map((exp) => THINGS_EXPAND_OPTIONS.find((opt) => opt.value === exp.entity))
                      .filter(Boolean) as SelectableValue<EntityType>[]) || []
                  }
                  onChange={onExpandChange}
                  placeholder="Select entities to expand..."
                />
              </InlineField>
            </InlineFieldRow>
          )}
          {currentQuery.entity === 'Datastreams' && (
            <InlineFieldRow>
              <InlineField
                label="Expand Entities"
                labelWidth={12}
                tooltip="Select related entities to include in the response"
                grow
              >
                <MultiSelect
                  options={DATASTREAMS_EXPAND_OPTIONS}
                  value={
                    (currentQuery.expand
                      ?.map((exp) => DATASTREAMS_EXPAND_OPTIONS.find((opt) => opt.value === exp.entity))
                      .filter(Boolean) as SelectableValue<EntityType>[]) || []
                  }
                  onChange={onExpandChange}
                  placeholder="Select entities to expand..."
                />
              </InlineField>
            </InlineFieldRow>
          )}

          <div style={{ height: '10px' }} />
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

          {/* Filter By Button */}
          <InlineFieldRow>
            <Button
              variant={showFilters ? 'primary' : 'secondary'}
              onClick={() => setShowFilters(!showFilters)}
              icon={showFilters ? 'angle-down' : 'angle-right'}
              className={styles.filterButton}
            >
              Filter By{' '}
              {currentQuery.filters && currentQuery.filters.filter(f => f.type !== 'variable').length > 0 ? `(${currentQuery.filters.filter(f => f.type !== 'variable').length})` : ''}
            </Button>
          </InlineFieldRow>

          {/* Filter Panel */}
          <Collapse isOpen={showFilters} collapsible label="">
            <FilterPanel
              entityType={currentQuery.entity}
              filters={currentQuery.filters || []}
              onFiltersChange={onFiltersChange}
            />
          </Collapse>

          {/* Variables Button */}
          <InlineFieldRow>
            <Button
              variant={showVariables ? 'primary' : 'secondary'}
              onClick={() => setShowVariables(!showVariables)}
              icon={showVariables ? 'angle-down' : 'angle-right'}
              className={styles.filterButton}
            >
              Variables{' '}
              {(() => {
                const variableFilters = (currentQuery.filters || []).filter(f => f.type === 'variable');
                return variableFilters.length > 0 ? `(${variableFilters.length})` : '';
              })()}
            </Button>
          </InlineFieldRow>

          {/* Variables Panel */}
          <Collapse isOpen={showVariables} collapsible label="">
            <VariablesPanel 
              filters={currentQuery.filters || []} 
              onFiltersChange={onFiltersChange} 
            />
          </Collapse>
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

        {/* Entity Browser */}
        <FieldSet label={`${currentQuery.entity} Browser`}>
          <div className={styles.searchRow}>
            <Input
              value={searchQuery}
              onChange={handleSearchChange}
              placeholder={`Search ${currentQuery.entity} by ID, name, or description`}
              width={30}
            />
            <Button onClick={fetchEntities} disabled={isLoading}>
              {isLoading ? 'Loading...' : 'Fetch Entities'}
            </Button>
          </div>

          {entityList.length > 0 ? (
            <div className={styles.tableContainer}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Name</th>
                    <th>Description</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredEntities.map((entity) => (
                    <tr key={entity['@iot.id']}>
                      <td>{entity['@iot.id']}</td>
                      <td>{entity.name || 'N/A'}</td>
                      <td className={styles.descriptionCell}>{entity.description || 'N/A'}</td>
                      <td>
                        <Button size="sm" variant="secondary" onClick={() => selectEntity(entity['@iot.id'])}>
                          Select
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className={styles.emptyState}>
              {isLoading ? 'Loading entities...' : 'Click "Fetch Entities" to browse available entities'}
            </div>
          )}
        </FieldSet>
      </Stack>
      <div style={{ width: '100%' }}>
        <FieldSet label="Query Preview">
          <div className={styles.queryPreview}>{previewQuery()}</div>
        </FieldSet>
      </div>
    </div>
  );
}
