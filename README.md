✅ Task Description
Update the Query Editor component of the current Grafana data source plugin to improve user interaction and data exploration. This task is limited to frontend development only.

🔧 UI Changes (Query Editor Component)
Remove useEffect on component mount

The current useEffect hook that triggers data fetching on component load should be removed.

No data should be fetched automatically when the component is mounted.

Replace the dropdown used for selecting the name field

Remove the existing dropdown component.

Instead, add a text input field that allows users to manually enter an Entity ID.

Add a searchable and filterable list of Things

Display a list of Things (or similar entities) from the results of dataSource.query().

The list should be shown in a tabular format.

Add a search bar or filter inputs that allow users to filter the list by:

Thing.id

Thing.name

Thing.description

This filtering should be handled entirely on the frontend