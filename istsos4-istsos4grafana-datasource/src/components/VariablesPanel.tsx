import React, { useState, ChangeEvent } from 'react';
import { InlineField, Input, Select, Button, FieldSet, IconButton } from '@grafana/ui';
import { SelectableValue } from '@grafana/data';
import { FilterCondition, VariableFilter, EntityType } from '../types';
import { ENTITY_OPTIONS } from '../utils/constants';
import { v4 as uuidv4 } from 'uuid';
import { getSingularEntityName } from 'utils/utils';

interface VariablesPanelProps {
  filters: FilterCondition[];
  onFiltersChange: (filters: FilterCondition[]) => void;
}

export function VariablesPanel({ filters, onFiltersChange }: VariablesPanelProps) {
  const [newVariable, setNewVariable] = useState<{ name: string; entity: any }>({
    name: '',
    entity: '',
  });

  const variableFilters = filters.filter(f => f.type === 'variable') as VariableFilter[];

  const handleAddVariable = () => {
    if (!newVariable.name || !newVariable.entity) {
      return;
    }

    const existingVariable = variableFilters.find(vf => vf.entity === newVariable.entity);
    if (existingVariable) {
      return; 
    }

    const variableFilter: VariableFilter = {
      id: uuidv4(),
      type: 'variable',
      field: 'id',
      operator: 'eq',
      value: null,
      entity: getSingularEntityName(newVariable.entity) as any,
      variableName: newVariable.name,
    };

    const updatedFilters = [...filters, variableFilter];
    onFiltersChange(updatedFilters);
    setNewVariable({ name: '', entity: '' });
  };

  const handleRemoveVariable = (variableFilterId: string) => {
    const updatedFilters = filters.filter(f => f.id !== variableFilterId);
    onFiltersChange(updatedFilters);
  };

  const handleVariableChange = (variableFilterId: string, field: 'variableName' | 'entity', value: any) => {
    const updatedFilters = filters.map(filter => {
      if (filter.id === variableFilterId && filter.type === 'variable') {
        const vf = filter as VariableFilter;
        return { ...vf, [field]: value };
      }
      return filter;
    });
    onFiltersChange(updatedFilters);
  };

  const getUsedEntities = () => {
    return variableFilters.map(vf => vf.entity.concat('s'));
  };

  const getAvailableEntities = () => {
    const usedEntities = getUsedEntities();
    return ENTITY_OPTIONS.filter(option => option.value && !usedEntities.includes(option.value));
  };

  return (
    <FieldSet label="Variables">
      {/* Existing Variables */}
      {variableFilters.length > 0 && (
        <div style={{ marginBottom: '12px' }}>
          {variableFilters.map((variableFilter) => (
            <div key={variableFilter.id} style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '8px', 
              marginBottom: '8px',
              padding: '8px',
              border: '1px solid #404040',
              borderRadius: '4px',
              backgroundColor: '#1a1a1a'
            }}>
              <InlineField label="Name" labelWidth={8}>
                <Input
                  value={variableFilter.variableName}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => 
                    handleVariableChange(variableFilter.id, 'variableName', e.target.value)
                  }
                  width={15}
                  placeholder="Variable name"
                />
              </InlineField>
              
              <InlineField label="Entity" labelWidth={8}>
                <Select
                  options={ENTITY_OPTIONS}
                  value={ENTITY_OPTIONS.find(opt => opt.value === variableFilter.entity)}
                  onChange={(value: SelectableValue<EntityType>) => 
                    handleVariableChange(variableFilter.id, 'entity', value.value!)
                  }
                  width={15}
                  isDisabled={true} // Disable changing entity once created to prevent conflicts
                />
              </InlineField>
              
              <IconButton
                name="trash-alt"
                tooltip="Remove variable"
                onClick={() => handleRemoveVariable(variableFilter.id)}
                variant="destructive"
              />
            </div>
          ))}
        </div>
      )}

      {/* Add New Variable */}
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: '8px', 
        marginBottom: '8px',
        padding: '8px',
        border: '1px dashed #404040',
        borderRadius: '4px'
      }}>
        <InlineField label="Name" labelWidth={8}>
          <Input
            value={newVariable.name || ''}
            onChange={(e: ChangeEvent<HTMLInputElement>) => 
              setNewVariable({ ...newVariable, name: e.target.value })
            }
            width={15}
            placeholder="Enter variable name"
          />
        </InlineField>
        
        <InlineField label="Entity" labelWidth={8}>
          <Select
            options={getAvailableEntities()}
            value={ENTITY_OPTIONS.find(opt => opt.value === newVariable.entity) || null}
            onChange={(value: SelectableValue<EntityType>) =>
              setNewVariable({ ...newVariable, entity: value.value! })
            }
            width={15}
            placeholder="Select entity"
          />
        </InlineField>
        
        <Button
          onClick={handleAddVariable}
          disabled={!newVariable.name || !newVariable.entity || getAvailableEntities().length === 0}
          icon="plus"
          variant="secondary"
        >
          Add
        </Button>
      </div>
    </FieldSet>
  );
}
