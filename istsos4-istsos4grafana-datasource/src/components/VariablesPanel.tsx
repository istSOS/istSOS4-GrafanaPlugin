import React, { useState, ChangeEvent } from 'react';
import { InlineField, Input, Select, Button, FieldSet, IconButton } from '@grafana/ui';
import { SelectableValue } from '@grafana/data';
import { Variable, EntityType } from '../types';
import { ENTITY_OPTIONS } from '../utils/constants';

interface VariablesPanelProps {
  variables: Variable[];
  onVariablesChange: (variables: Variable[]) => void;
}

export function VariablesPanel({ variables, onVariablesChange }: VariablesPanelProps) {
  const [newVariable, setNewVariable] = useState<Partial<Variable>>({
    name: '',
    entity: 'Things',
  });

  const handleAddVariable = () => {
    if (!newVariable.name || !newVariable.entity) {
      return;
    }

    const existingVariable = variables.find(v => v.entity === newVariable.entity);
    if (existingVariable) {
      return;
    }

    const variable: Variable = {
      name: newVariable.name,
      entity: newVariable.entity,
    };

    onVariablesChange([...variables, variable]);
    setNewVariable({ name: '', entity: 'Things' });
  };

  const handleRemoveVariable = (index: number) => {
    const updatedVariables = variables.filter((_, i) => i !== index);
    onVariablesChange(updatedVariables);
  };

  const handleVariableChange = (index: number, field: keyof Variable, value: any) => {
    const updatedVariables = variables.map((variable, i) => {
      if (i === index) {
        return { ...variable, [field]: value };
      }
      return variable;
    });
    onVariablesChange(updatedVariables);
  };

  const getUsedEntities = () => {
    return variables.map(v => v.entity);
  };

  const getAvailableEntities = () => {
    const usedEntities = getUsedEntities();
    return ENTITY_OPTIONS.filter(option => !usedEntities.includes(option.value!));
  };

  return (
    <FieldSet label="Variables">
      {/* Existing Variables */}
      {variables.length > 0 && (
        <div style={{ marginBottom: '12px' }}>
          {variables.map((variable, index) => (
            <div key={index} style={{ 
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
                  value={variable.name}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => 
                    handleVariableChange(index, 'name', e.target.value)
                  }
                  width={15}
                  placeholder="Variable name"
                />
              </InlineField>
              
              <InlineField label="Entity" labelWidth={8}>
                <Select
                  options={ENTITY_OPTIONS}
                  value={ENTITY_OPTIONS.find(opt => opt.value === variable.entity)}
                  onChange={(value: SelectableValue<EntityType>) => 
                    handleVariableChange(index, 'entity', value.value!)
                  }
                  width={15}
                  isDisabled={true}
                />
              </InlineField>
              
              <IconButton
                name="trash-alt"
                tooltip="Remove variable"
                onClick={() => handleRemoveVariable(index)}
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
            value={ENTITY_OPTIONS.find(opt => opt.value === newVariable.entity)}
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
