import React, { useState } from 'react';
import { Button, FieldSet, InlineField, InlineFieldRow, Input, Select, TextArea, useStyles2 } from '@grafana/ui';
import { GrafanaTheme2, SelectableValue } from '@grafana/data';
import { css } from '@emotion/css';
import { v4 as uuidv4 } from 'uuid';
import {
  FilterCondition,
  FilterType,
  FilterField,
  TemporalFilter,
  BasicFilter,
  MeasurementFilter,
  SpatialFilter,
  ComplexFilter,
  EntityType,
  ObservationFilter,
} from '../types';
import { COMMON_FIELDS, OBSERVATION_FIELDS, FILTER_TYPES, COMPARISON_OPERATORS, STRING_OPERATORS, SPATIAL_OPERATORS, TEMPORAL_FUNCTIONS, GEOMETRY_TYPES, MEASUREMENT_FIELDS, TEMPORAL_FIELDS, SPATIAL_FIELDS } from '../utils/constants';

interface FilterPanelProps {
  entityType: EntityType;
  filters: FilterCondition[];
  onFiltersChange: (filters: FilterCondition[]) => void;
}

export const FilterPanel: React.FC<FilterPanelProps> = ({ entityType, filters, onFiltersChange }) => {
  const styles = useStyles2(getStyles);
  const [showAddFilter, setShowAddFilter] = useState(false);
  const [newFilterType, setNewFilterType] = useState<FilterType>('basic');
  const getFieldOptions = (filterType?: FilterType): Array<SelectableValue<FilterField>> => {
    const typeToCheck = filterType || newFilterType;
    
    if (typeToCheck === 'basic') {
      return COMMON_FIELDS;
    }
    switch (entityType) {
      case 'Observations':
        return OBSERVATION_FIELDS;
      case 'Datastreams':
        switch (typeToCheck) {
          case 'measurement':
            return MEASUREMENT_FIELDS;
          case 'temporal':
            return TEMPORAL_FIELDS;
          case 'spatial':
            return  SPATIAL_FIELDS;
          default:
            return COMMON_FIELDS;
        }
      default:
        return COMMON_FIELDS;
    }
  };

  const addFilter = () => {
    const baseFilter: FilterCondition = {
      id: uuidv4(),
      type: newFilterType,
      field: getFieldOptions()[0].value!,
      operator: 'eq',
      value: '',
     
    };

    let newFilter: FilterCondition;

    switch (newFilterType) {
      case 'temporal':
        newFilter = {
          ...baseFilter,
          // For Observations, default is resultTime, otherwise phenomenonTime
          field: entityType === 'Observations' ? 'resultTime' : 'phenomenonTime',
          operator: 'ge', // Default to range filter
          startDate: new Date().toISOString(),
          endDate: new Date().toISOString(),
        } as TemporalFilter;
        break;
      case 'spatial':
        newFilter = {
          ...baseFilter,
          field: 'observedArea',
          operator: 'st_within',
          geometryType: 'Point',
          coordinates: [0, 0],
        } as SpatialFilter;
        break;
      case 'complex':
        newFilter = {
          ...baseFilter,
          expression: '',
        } as ComplexFilter;
        break;
      case 'Observation':
        const defaultField = OBSERVATION_FIELDS[0].value!;
        newFilter = {
          ...baseFilter,
          field: defaultField,
          operator: 'eq',
          value: defaultField === 'result' ? '0' : new Date().toISOString(),
        } as ObservationFilter;
        break;
      default:
        newFilter = baseFilter;
    }

    onFiltersChange([...filters, newFilter]);
    setShowAddFilter(false);
  };

  const updateFilter = (id: string, updates: Partial<FilterCondition>) => {
    const updatedFilters = filters.map(filter => filter.id === id ? { ...filter, ...updates } : filter);
    onFiltersChange(updatedFilters);
  };

  const removeFilter = (id: string) => {
    const updatedFilters = filters.filter(filter => filter.id !== id);
    onFiltersChange(updatedFilters);
  };

  const clearAllFilters = () => {
    onFiltersChange([]);
  };

  const getOperatorOptions = (filter: FilterCondition): Array<SelectableValue<any>> => {
    if (filter.type === 'spatial') {
      return SPATIAL_OPERATORS;
    } else if (filter.type === 'temporal' && ['year', 'month', 'day', 'hour', 'minute', 'second'].includes(filter.operator)) {
      return TEMPORAL_FUNCTIONS;
    } else if (filter.type === 'basic') {
      if (filter.field === '@iot.id') {
        return COMPARISON_OPERATORS;
      }
      return [...COMPARISON_OPERATORS, ...STRING_OPERATORS];
    } else {
      return COMPARISON_OPERATORS;
    }
  };

  const renderFilterForm = (filter: FilterCondition, index: number) => {
    switch (filter.type) {
      case 'temporal':
        return renderTemporalFilter(filter as TemporalFilter, index);
      case 'basic':
        return renderBasicFilter(filter as BasicFilter, index);
      case 'measurement':
        return renderMeasurementFilter(filter as MeasurementFilter, index);
      case 'spatial':
        return renderSpatialFilter(filter as SpatialFilter, index);
      case 'complex':
        return renderComplexFilter(filter as ComplexFilter, index);
      case 'Observation':
        return renderObservationFilter(filter as ObservationFilter, index);
      default:
        return null;
    }
  };

  const getPossibleFilters = (entityType: EntityType): Array<SelectableValue<FilterType>> => {
    switch (entityType) {
      case 'Things':
        // Only Basic Filter is allowed for Things (for now)
        return [FILTER_TYPES[0]] as Array<SelectableValue<FilterType>>;
      case 'Datastreams':
        return FILTER_TYPES;
      default:
        return FILTER_TYPES;
    }
  };

  const renderTemporalFilter = (filter: TemporalFilter, index: number) => {
    return (
      <div className={styles.filterForm}>
        <InlineFieldRow>
          <InlineField label="Field" labelWidth={10}>
            <Select
              options={getFieldOptions(filter.type)}
              value={filter.field}
              onChange={v => updateFilter(filter.id, { field: v.value! })}
              width={20}
            />
          </InlineField>
        </InlineFieldRow>
        
        <InlineFieldRow>
          <InlineField label="Filter Type" labelWidth={10}>
            <Select
              options={[
                { label: 'Date Range', value: 'range', description: 'Filter by date range' },
                { label: 'Temporal Function', value: 'function', description: 'Filter by temporal function (year, month, etc.)' }
              ]}
              value={filter.operator === 'eq' || filter.operator === 'ne' || 
                     filter.operator === 'gt' || filter.operator === 'ge' || 
                     filter.operator === 'lt' || filter.operator === 'le' ? 'range' : 'function'}
              onChange={v => {
                if (v.value === 'range') {
                  updateFilter(filter.id, { 
                    operator: 'ge',
                    startDate: filter.startDate || new Date().toISOString(),
                    endDate: filter.endDate || new Date().toISOString()
                  } as Partial<TemporalFilter>);
                } else {
                  updateFilter(filter.id, { 
                    operator: 'year',
                    value: new Date().getFullYear()
                  } as Partial<TemporalFilter>);
                }
              }}
              width={20}
            />
          </InlineField>
        </InlineFieldRow>
        
        {(filter.operator === 'eq' || filter.operator === 'ne' || 
          filter.operator === 'gt' || filter.operator === 'ge' || 
          filter.operator === 'lt' || filter.operator === 'le') && (
          <>
            <InlineFieldRow>
              <InlineField label="Start Date" labelWidth={10}>
                <Input
                  type="datetime-local"
                  value={filter.startDate ? new Date(filter.startDate).toISOString().slice(0, 16) : ''}
                  onChange={e => {
                    const date = new Date(e.currentTarget.value);
                    updateFilter(filter.id, { startDate: date.toISOString() } as Partial<TemporalFilter>);
                  }}
                  width={20}
                />
              </InlineField>
            </InlineFieldRow>
            
            <InlineFieldRow>
              <InlineField label="End Date" labelWidth={10}>
                <Input
                  type="datetime-local"
                  value={filter.endDate ? new Date(filter.endDate).toISOString().slice(0, 16) : ''}
                  onChange={e => {
                    const date = new Date(e.currentTarget.value);
                    updateFilter(filter.id, { endDate: date.toISOString() } as Partial<TemporalFilter>);
                  }}
                  width={20}
                />
              </InlineField>
            </InlineFieldRow>
          </>
        )}
        
        {(filter.operator === 'year' || filter.operator === 'month' || 
          filter.operator === 'day' || filter.operator === 'hour' || 
          filter.operator === 'minute' || filter.operator === 'second') && (
          <>
            <InlineFieldRow>
              <InlineField label="Function" labelWidth={10}>
                <Select
                  options={TEMPORAL_FUNCTIONS}
                  value={filter.operator}
                  onChange={v => updateFilter(filter.id, { operator: v.value! })}
                  width={20}
                />
              </InlineField>
            </InlineFieldRow>
            
            <InlineFieldRow>
              <InlineField label="Value" labelWidth={10}>
                <Input
                  type="number"
                  value={filter.value as number}
                  onChange={e => updateFilter(filter.id, { value: parseInt(e.currentTarget.value, 10) })}
                  width={20}
                />
              </InlineField>
            </InlineFieldRow>
          </>
        )}
      </div>
    );
  };

  const renderBasicFilter = (filter: BasicFilter, index: number) => {
    return (
      <div className={styles.filterForm}>
        <InlineFieldRow>
          <InlineField label="Field" labelWidth={10}>
            <Select
              options={getFieldOptions(filter.type)}
              value={filter.field}
              onChange={v => updateFilter(filter.id, { field: v.value! })}
              width={20}
            />
          </InlineField>
        </InlineFieldRow>
        
        <InlineFieldRow>
          <InlineField label="Operator" labelWidth={10}>
            <Select
              options={getOperatorOptions(filter)}
              value={filter.operator}
              onChange={v => updateFilter(filter.id, { operator: v.value! })}
              width={20}
            />
          </InlineField>
        </InlineFieldRow>
        
        <InlineFieldRow>
          <InlineField label="Value" labelWidth={10}>
            <Input
              value={filter.value as string}
              onChange={e => updateFilter(filter.id, { value: e.currentTarget.value })}
              width={20}
            />
          </InlineField>
        </InlineFieldRow>
      </div>
    );
  };

  const renderMeasurementFilter = (filter: MeasurementFilter, index: number) => {
    return (
      <div className={styles.filterForm}>
        <InlineFieldRow>
          <InlineField label="Field" labelWidth={10}>
            <Select
              options={MEASUREMENT_FIELDS}
              value={filter.field}
              onChange={v => updateFilter(filter.id, { field: v.value! })}
              width={20}
            />
          </InlineField>
        </InlineFieldRow>
        
        <InlineFieldRow>
          <InlineField label="Operator" labelWidth={10}>
            <Select
              options={COMPARISON_OPERATORS}
              value={filter.operator}
              onChange={v => updateFilter(filter.id, { operator: v.value! })}
              width={20}
            />
          </InlineField>
        </InlineFieldRow>
        
        <InlineFieldRow>
          <InlineField label="Value" labelWidth={10}>
            <Input
              value={filter.value as string}
              onChange={e => updateFilter(filter.id, { value: e.currentTarget.value })}
              width={20}
            />
          </InlineField>
        </InlineFieldRow>
      </div>
    );
  };


  // To be Updated and Checked
  const renderSpatialFilter = (filter: SpatialFilter, index: number) => {
    return (
      <div className={styles.filterForm}>
        <InlineFieldRow>
          <InlineField label="Field" labelWidth={10}>
            <Select
              options={getFieldOptions(filter.type).filter(f => f.value === 'observedArea')}
              value={filter.field}
              onChange={v => updateFilter(filter.id, { field: v.value! })}
              width={20}
            />
          </InlineField>
        </InlineFieldRow>
        
        <InlineFieldRow>
          <InlineField label="Operator" labelWidth={10}>
            <Select
              options={SPATIAL_OPERATORS}
              value={filter.operator}
              onChange={v => updateFilter(filter.id, { operator: v.value! })}
              width={20}
            />
          </InlineField>
        </InlineFieldRow>
        
        <InlineFieldRow>
          <InlineField label="Geometry Type" labelWidth={10}>
            <Select
              options={GEOMETRY_TYPES}
              value={filter.geometryType}
              onChange={v => {
                // Reset coordinates to valid defaults based on the selected geometry type
                let defaultCoordinates;
                switch (v.value) {
                  case 'Point':
                    defaultCoordinates = [0, 0];
                    break;
                  case 'LineString':
                    defaultCoordinates = [[0, 0], [1, 1]];
                    break;
                  case 'Polygon':
                    // Polygon requires a closed ring (first and last points match)
                    defaultCoordinates = [[[0, 0], [1, 0], [1, 1], [0, 0]]];
                    break;
                  default:
                    defaultCoordinates = [0, 0];
                }
                updateFilter(filter.id, { 
                  geometryType: v.value! as any,
                  coordinates: defaultCoordinates 
                } as Partial<SpatialFilter>);
              }}
              width={20}
            />
          </InlineField>
        </InlineFieldRow>
        
        <InlineFieldRow>
          <InlineField 
            label="Coordinates" 
            labelWidth={10} 
            tooltip={
              filter.geometryType === 'Point' ? "Enter as [longitude, latitude]" :
              filter.geometryType === 'LineString' ? "Enter as array of points [[lon1, lat1], [lon2, lat2], ...]" :
              "Enter as array of rings [[[lon1, lat1], [lon2, lat2], ...]], first and last point must be identical"
            }
          >
            <TextArea
              value={JSON.stringify(filter.coordinates)}
              onChange={e => {
                try {
                  const coords = JSON.parse(e.currentTarget.value);
                  updateFilter(filter.id, { coordinates: coords } as Partial<SpatialFilter>);
                } catch (error) {
               
                }
              }}
                            rows={3}
              placeholder={
                filter.geometryType === 'Point' ? "[0, 0]" :
                filter.geometryType === 'LineString' ? "[[0, 0], [1, 1]]" :
                "[[[0, 0], [1, 0], [1, 1], [0, 0]]]"
              }
            />
          </InlineField>
        </InlineFieldRow>
        
        {filter.operator === 'st_distance' && (
          <InlineFieldRow>
            <InlineField label="Distance" labelWidth={10}>
              <Input
                type="number"
                value={filter.value as string}
                onChange={e => updateFilter(filter.id, { value: parseFloat(e.currentTarget.value) })}
                width={20}
              />
            </InlineField>
          </InlineFieldRow>
        )}
      </div>
    );
  };

  const renderComplexFilter = (filter: ComplexFilter, index: number) => {
    return (
      <div className={styles.filterForm}>
        <InlineFieldRow>
          <InlineField label="Expression" labelWidth={10} tooltip="Enter a valid OData filter expression">
            <TextArea
              value={filter.expression || ''}
              onChange={e => updateFilter(filter.id, { expression: e.currentTarget.value })}
              rows={5}
              placeholder="e.g., unitOfMeasurement/name eq 'degree Celsius' and result gt 20"
            />
          </InlineField>
        </InlineFieldRow>
      </div>
    );
  };

  const formatDateForInput = (dateString: string | undefined): string => {
    if (!dateString) return '';
    try {
      return new Date(dateString).toISOString().slice(0, 16);
    } catch (e) {
      console.error('Invalid date format:', dateString);
      return '';
    }
  };

  const renderObservationFilter = (filter: ObservationFilter, index: number) => {
    return (
      <div className={styles.filterForm}>
        <InlineFieldRow>
          <InlineField label="Field" labelWidth={10}>
            <Select
              options={OBSERVATION_FIELDS}
              value={filter.field}
              onChange={v => {
                const newValue = v.value === 'result' ? '0' : new Date().toISOString();
                updateFilter(filter.id, { field: v.value!, value: newValue });
              }}
              width={20}
            />
          </InlineField>
        </InlineFieldRow>
        
        <InlineFieldRow>
          <InlineField label="Operator" labelWidth={10}>
            <Select
              options={COMPARISON_OPERATORS}
              value={filter.operator}
              onChange={v => updateFilter(filter.id, { operator: v.value! })}
              width={20}
            />
          </InlineField>
        </InlineFieldRow>
        
        <InlineFieldRow>
          <InlineField label="Value" labelWidth={10}>
            {filter.field === 'result' ? (
              <Input
                value={filter.value as string}
                onChange={e => updateFilter(filter.id, { value: e.currentTarget.value })}
                width={20}
              />
            ) : (
              <Input
                type="datetime-local"
                value={formatDateForInput(filter.value as string)}
                onChange={e => {
                  try {
                    const date = new Date(e.currentTarget.value);
                    updateFilter(filter.id, { value: date.toISOString() });
                  } catch (error) {
                    console.error('Invalid date input:', error);
                  }
                }}
                width={20}
              />
            )}
          </InlineField>
        </InlineFieldRow>
      </div>
    );
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h5>Filters</h5>
        <div>
          <Button variant="secondary" size="sm" onClick={clearAllFilters} disabled={filters.length === 0}>
            Clear All
          </Button>
          {!showAddFilter && (
            <Button variant="primary" size="sm" onClick={() => setShowAddFilter(true)} icon="plus" className={styles.addButton}>
              Add Filter
            </Button>
          )}
        </div>
      </div>

      {showAddFilter && (
        <FieldSet label="New Filter">
          <InlineFieldRow>
            <InlineField label="Filter Type" labelWidth={10}>
              <Select
                options={getPossibleFilters(entityType)}
                value={newFilterType}
                onChange={v => setNewFilterType(v.value!)}
                width={20}
              />
            </InlineField>
          </InlineFieldRow>
          <div className={styles.buttonRow}>
            <Button variant="secondary" size="sm" onClick={() => setShowAddFilter(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" onClick={addFilter}>
              Add
            </Button>
          </div>
        </FieldSet>
      )}

      {filters.filter(f=> f.type!=='variable').length === 0 ? (
        <div className={styles.emptyState}>No filters applied. Click "Add Filter" to create one.</div>
      ) : (
        <div className={styles.filterList}>
          {filters.filter(f=> f.type!=='variable').map((filter, index) => (
            <FieldSet
              key={filter.id}
              label={`${filter.type.charAt(0).toUpperCase() + filter.type.slice(1)} Filter`}
              className={styles.filterItem}
            >
              {renderFilterForm(filter, index)}
              <div className={styles.filterActions}>

                <Button variant="destructive" size="sm" onClick={() => removeFilter(filter.id)} icon="trash-alt">
                  Remove
                </Button>
              </div>
            </FieldSet>
          ))}
        </div>
      )}
    </div>
  );
};

const getStyles = (theme: GrafanaTheme2) => {
  return {
    container: css`
      margin-top: ${theme.spacing(2)};
    `,
    header: css`
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: ${theme.spacing(1)};
    `,
    addButton: css`
      margin-left: ${theme.spacing(1)};
    `,
    emptyState: css`
      padding: ${theme.spacing(2)};
      text-align: center;
      background-color: ${theme.colors.background.secondary};
      border-radius: ${theme.shape.borderRadius()};
      color: ${theme.colors.text.secondary};
    `,
    filterList: css`
      display: flex;
      flex-direction: column;
      gap: ${theme.spacing(2)};
    `,
    filterItem: css`
      border: 1px solid ${theme.colors.border.medium};
      border-radius: ${theme.shape.borderRadius()};
      background-color: ${theme.colors.background.secondary};
    `,
    filterForm: css`
      padding: ${theme.spacing(1)} 0;
    `,
    filterActions: css`
      display: flex;
      justify-content: flex-end;
      gap: ${theme.spacing(1)};
      margin-top: ${theme.spacing(1)};
    `,
    buttonRow: css`
      display: flex;
      justify-content: flex-end;
      gap: ${theme.spacing(1)};
      margin-top: ${theme.spacing(1)};
    `,
  };
}; 