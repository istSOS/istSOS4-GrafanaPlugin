import proj4 from "proj4";
import { GrafanaTheme2 } from "@grafana/data";
import { css } from "@emotion/css";
// EPSG:2056 (CH1903+ / LV95)
proj4.defs("EPSG:2056", "+proj=somerc +lat_0=46.95240555555556 +lon_0=7.439583333333333 +k=1 +x_0=2600000 +y_0=1200000 +ellps=bessel +units=m +no_defs");

export const convertEPSG2056ToWGS84 = (x: number, y: number): [number, number] => {
  const [lon, lat] = proj4("EPSG:2056", "WGS84", [x, y]);
  return [lon, lat];
};

export const formatPhenomenonTime = (phenomenonTime: string | null | undefined): string => {
  if (!phenomenonTime) {
    return '';
  }
  try {
    // Handle time intervals ("2023-01-01T00:00:00Z/2023-01-02T00:00:00Z")
    // This handles Datastreams (usually a time interval with / between start and end times)
    if (phenomenonTime.includes('/')) {
      const [startTime, endTime] = phenomenonTime.split('/');
      const startFormatted = new Date(startTime).toLocaleString();
      const endFormatted = new Date(endTime).toLocaleString();
      return `${startFormatted} to ${endFormatted}`;
    }
    // Handle single timestamp
    // This handles Observations (usually a single timestamp)
    const date = new Date(phenomenonTime);
    return date.toLocaleString();
  } catch (error) {
    console.warn('Error formatting phenomenon time:', error);
    return phenomenonTime;
  }
};


export const getStyles = (theme: GrafanaTheme2) => {
  return {
    searchRow: css`
      display: flex;
      justify-content: space-between;
      margin-bottom: 10px;
      align-items: center;
    `,
    tableContainer: css`
      max-height: 300px;
      overflow: auto;
      border: 1px solid ${theme.colors.border.medium};
      border-radius: ${theme.shape.borderRadius()};
    `,
    table: css`
      width: 100%;
      border-collapse: collapse;
      
      th, td {
        padding: 8px;
        text-align: left;
        border-bottom: 1px solid ${theme.colors.border.weak};
      }
      
      th {
        background-color: ${theme.colors.background.secondary};
        position: sticky;
        top: 0;
        z-index: 1;
      }
      
      tr:hover {
        background-color: ${theme.colors.background.secondary};
      }
    `,
    descriptionCell: css`
      max-width: 300px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    `,
    emptyState: css`
      text-align: center;
      padding: 20px;
      color: ${theme.colors.text.secondary};
    `,
    queryPreview: css`
      padding: 8px;
      background-color: ${theme.colors.background.secondary};
      border-radius: ${theme.shape.borderRadius()};
      font-family: monospace;
      font-size: 14px;
      color: ${theme.colors.text.primary};
      border: 1px solid ${theme.colors.border.medium};
      max-height: 120px;
      overflow-y: auto;
      overflow-x: auto;
      white-space: pre-wrap;
      word-break: break-word;
      line-height: 1.4;
      width: 100%;
      box-sizing: border-box;
    `,
    filterButton: css`
      margin-top: ${theme.spacing(1)};
    `,
  };
};