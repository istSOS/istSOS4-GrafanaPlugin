import React from 'react';
import { QueryEditorProps } from '@grafana/data';
import { DataSource } from '../datasource';
import { IstSOS4Query, MyDataSourceOptions } from '../types';
import { QueryEditor } from './QueryEditor';

export const VariableQueryEditor = (props: QueryEditorProps<DataSource, IstSOS4Query, MyDataSourceOptions>) => {
  return <QueryEditor {...props} />;
};
