import React, { useState, useEffect } from "react";
import {
  Upload,
  FileText,
  BarChart3,
  AlertCircle,
  CheckCircle,
  Loader,
  PieChart,
} from "lucide-react";
import Plot from "react-plotly.js";

const API_BASE_URL = "http://localhost:8000";

const EDAApp = () => {
  const [file, setFile] = useState(null);
  const [uploadStatus, setUploadStatus] = useState("idle"); // idle, uploading, success, error
  const [uploadMessage, setUploadMessage] = useState("");
  const [columns, setColumns] = useState([]);
  const [summary, setSummary] = useState(null);
  const [aggregationResult, setAggregationResult] = useState(null);
  const [loading, setLoading] = useState(false);

  // Aggregation form state
  const [catCol, setCatCol] = useState("");
  const [conCol, setConCol] = useState("");
  const [aggFunc, setAggFunc] = useState("mean");

  // Visualization state
  const [showChart, setShowChart] = useState(true);
  const [chartType, setChartType] = useState("bar"); // 'bar', 'pie', 'line'

  const aggFunctions = [
    "sum",
    "mean",
    "min",
    "max",
    "count",
    "n_unique",
    "median",
    "std",
  ];

  const handleFileChange = (event) => {
    const selectedFile = event.target.files[0];
    if (selectedFile && selectedFile.type === "text/csv") {
      setFile(selectedFile);
      setUploadStatus("idle");
      setUploadMessage("");
    } else {
      alert("Please select a valid CSV file");
    }
  };

  const uploadFile = async () => {
    if (!file) {
      alert("Please select a file first");
      return;
    }

    setUploadStatus("uploading");
    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch(`${API_BASE_URL}/upload/`, {
        method: "POST",
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        setUploadStatus("success");
        setUploadMessage(data.message);
        setColumns(data.columns);
        // Auto-fetch summary after successful upload
        fetchSummary();
      } else {
        const errorData = await response.json();
        setUploadStatus("error");
        setUploadMessage(errorData.detail || "Upload failed");
      }
    } catch (error) {
      setUploadStatus("error");
      setUploadMessage("Network error occurred");
      console.error("Upload error:", error);
    }
  };

  const fetchSummary = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/summary/`);
      if (response.ok) {
        const data = await response.json();
        setSummary(data);
      } else {
        const errorData = await response.json();
        alert(`Error fetching summary: ${errorData.detail}`);
      }
    } catch (error) {
      alert("Network error occurred while fetching summary");
      console.error("Summary error:", error);
    }
    setLoading(false);
  };

  const performAggregation = async () => {
    if (!catCol || !conCol) {
      alert("Please select both categorical and continuous columns");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(
        `${API_BASE_URL}/aggregate/?cat_col=${encodeURIComponent(
          catCol
        )}&con_col=${encodeURIComponent(conCol)}&agg_func=${aggFunc}`
      );

      if (response.ok) {
        const data = await response.json();
        setAggregationResult(data);
      } else {
        const errorData = await response.json();
        alert(`Error performing aggregation: ${errorData.detail}`);
      }
    } catch (error) {
      alert("Network error occurred during aggregation");
      console.error("Aggregation error:", error);
    }
    setLoading(false);
  };

  const getStatusIcon = () => {
    switch (uploadStatus) {
      case "uploading":
        return <Loader className="animate-spin w-5 h-5 text-blue-500" />;
      case "success":
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case "error":
        return <AlertCircle className="w-5 h-5 text-red-500" />;
      default:
        return <Upload className="w-5 h-5 text-gray-400" />;
    }
  };

  const getStatusColor = () => {
    switch (uploadStatus) {
      case "uploading":
        return "text-blue-600 bg-blue-50 border-blue-200";
      case "success":
        return "text-green-600 bg-green-50 border-green-200";
      case "error":
        return "text-red-600 bg-red-50 border-red-200";
      default:
        return "text-gray-600 bg-gray-50 border-gray-200";
    }
  };

  const getStringColumns = () => {
    if (!summary) return columns; // fallback to all columns if no summary
    return summary.columns
      .filter(
        (col) =>
          col.dtype === "String" ||
          col.dtype === "Utf8" ||
          col.dtype === "Categorical"
      )
      .map((col) => col.column);
  };

  const getNumericColumns = () => {
    if (!summary) return columns; // fallback to all columns if no summary
    return summary.columns
      .filter((col) =>
        ["Int64", "Int32", "Int16", "Int8", "Float64", "Float32"].includes(
          col.dtype
        )
      )
      .map((col) => col.column);
  };

  const renderSummaryChart = () => {
    if (!summary || !summary.columns) return null;

    // Data for missing values chart
    const missingData = summary.columns.filter((col) => col.missing > 0);

    if (missingData.length === 0) return null;

    return (
      <div className="mt-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-3">
          Missing Values Visualization
        </h3>
        <div className="bg-gray-50 p-4 rounded-lg">
          <Plot
            data={[
              {
                x: missingData.map((col) => col.column),
                y: missingData.map((col) => col.missing),
                type: "bar",
                marker: {
                  color: "rgba(239, 68, 68, 0.7)",
                  line: {
                    color: "rgba(239, 68, 68, 1)",
                    width: 2,
                  },
                },
                name: "Missing Values",
              },
            ]}
            layout={{
              title: "Missing Values by Column",
              xaxis: { title: "Columns" },
              yaxis: { title: "Count of Missing Values" },
              height: 400,
              margin: { t: 50, b: 50, l: 50, r: 50 },
              plot_bgcolor: "rgba(0,0,0,0)",
              paper_bgcolor: "rgba(0,0,0,0)",
            }}
            config={{ displayModeBar: false }}
            style={{ width: "100%" }}
          />
        </div>
      </div>
    );
  };

  const renderAggregationChart = () => {
    if (!aggregationResult || !aggregationResult.data) return null;

    const categoryCol = aggregationResult.group_by;
    const valueCol = Object.keys(aggregationResult.data).find(
      (key) => key !== categoryCol
    );

    // Safety check - make sure we have the right data
    if (!categoryCol || !valueCol) {
      console.error("Missing category or value column", {
        categoryCol,
        valueCol,
        data: aggregationResult.data,
      });
      return (
        <div className="text-red-600 p-4">
          Error: Invalid data structure for visualization
        </div>
      );
    }

    const categories = aggregationResult.data[categoryCol];
    const values = aggregationResult.data[valueCol];

    // Ensure we have data arrays
    if (!Array.isArray(categories) || !Array.isArray(values)) {
      console.error("Categories or values are not arrays", {
        categories,
        values,
      });
      return (
        <div className="text-red-600 p-4">
          Error: Invalid data format for visualization
        </div>
      );
    }

    // Ensure arrays have the same length
    if (categories.length !== values.length) {
      console.error("Categories and values length mismatch", {
        categoriesLength: categories.length,
        valuesLength: values.length,
      });
      return (
        <div className="text-red-600 p-4">Error: Data length mismatch</div>
      );
    }

    console.log("Chart data:", {
      categories,
      values,
      categoryCol,
      valueCol,
      aggregationResult,
      categoriesType: typeof categories[0],
      valuesType: typeof values[0],
    });

    const getChartData = () => {
      switch (chartType) {
        case "pie":
          return [
            {
              labels: categories,
              values: values,
              type: "pie",
              marker: {
                colors: [
                  "#3B82F6",
                  "#10B981",
                  "#F59E0B",
                  "#EF4444",
                  "#8B5CF6",
                  "#F97316",
                  "#06B6D4",
                  "#84CC16",
                ],
              },
              textinfo: "label+percent+value",
              textposition: "auto",
              hovertemplate: `<b>%{label}</b><br>Value: %{value}<br>Percentage: %{percent}<extra></extra>`,
            },
          ];
        case "line":
          return [
            {
              x: categories,
              y: values,
              type: "scatter",
              mode: "lines+markers",
              marker: { color: "#3B82F6", size: 8 },
              line: { color: "#3B82F6", width: 3 },
              text: values.map((v) =>
                typeof v === "number" ? v.toFixed(2) : v
              ),
              hovertemplate: `<b>%{x}</b><br>${valueCol}: %{y}<extra></extra>`,
            },
          ];
        default: // bar
          return [
            {
              x: categories,
              y: values,
              type: "bar",
              marker: {
                color: "#3B82F6",
                line: { color: "#1D4ED8", width: 2 },
              },
              text: values.map((v) =>
                typeof v === "number" ? v.toFixed(2) : v
              ),
              textposition: "outside",
              hovertemplate: `<b>%{x}</b><br>${valueCol}: %{y}<extra></extra>`,
            },
          ];
      }
    };

    const getLayout = () => {
      const baseLayout = {
        height: 500,
        margin: { t: 50, b: 80, l: 60, r: 50 },
        plot_bgcolor: "rgba(0,0,0,0)",
        paper_bgcolor: "rgba(0,0,0,0)",
      };

      if (chartType === "pie") {
        return {
          ...baseLayout,
          title: `${aggFunc}(${
            Object.keys(aggregationResult.aggregate)[0]
          }) by ${categoryCol}`,
          showlegend: true,
        };
      }

      return {
        ...baseLayout,
        title: `${aggFunc}(${
          Object.keys(aggregationResult.aggregate)[0]
        }) by ${categoryCol}`,
        xaxis: {
          title: categoryCol,
          tickangle: categories.length > 5 ? -45 : 0,
        },
        yaxis: { title: valueCol },
      };
    };

    return (
      <div className="mt-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-800">
            Aggregation Visualization
          </h3>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-700">
                Chart Type:
              </label>
              <select
                value={chartType}
                onChange={(e) => setChartType(e.target.value)}
                className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="bar">Bar Chart</option>
                <option value="pie">Pie Chart</option>
                <option value="line">Line Chart</option>
              </select>
            </div>
            <button
              onClick={() => setShowChart(!showChart)}
              className="px-3 py-1 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 text-sm flex items-center gap-1"
            >
              <PieChart className="w-4 h-4" />
              {showChart ? "Hide Chart" : "Show Chart"}
            </button>
          </div>
        </div>

        {showChart && (
          <div className="bg-gray-50 p-4 rounded-lg">
            <Plot
              data={getChartData()}
              layout={getLayout()}
              config={{
                displayModeBar: true,
                modeBarButtonsToRemove: ["pan2d", "lasso2d", "select2d"],
                displaylogo: false,
              }}
              style={{ width: "100%" }}
            />
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        <header className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">
            Exploratory Data Analysis
          </h1>
          <p className="text-gray-600">
            Upload your CSV file and explore your data
          </p>
        </header>

        {/* File Upload Section */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h2 className="text-2xl font-semibold text-gray-800 mb-4 flex items-center">
            <FileText className="w-6 h-6 mr-2" />
            File Upload
          </h2>

          <div className="space-y-4">
            <div>
              <input
                type="file"
                accept=".csv"
                onChange={handleFileChange}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                disabled={uploadStatus === "uploading"}
              />
            </div>

            <button
              onClick={uploadFile}
              disabled={!file || uploadStatus === "uploading"}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
            >
              {getStatusIcon()}
              {uploadStatus === "uploading" ? "Uploading..." : "Upload CSV"}
            </button>

            {uploadMessage && (
              <div className={`p-3 rounded-lg border ${getStatusColor()}`}>
                {uploadMessage}
              </div>
            )}

            {columns.length > 0 && (
              <div className="mt-4">
                <h3 className="font-semibold text-gray-700 mb-2">
                  Columns detected:
                </h3>
                <div className="flex flex-wrap gap-2">
                  {columns.map((col, index) => (
                    <span
                      key={index}
                      className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
                    >
                      {col}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Summary Section */}
        {summary && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-8">
            <h2 className="text-2xl font-semibold text-gray-800 mb-4 flex items-center">
              <BarChart3 className="w-6 h-6 mr-2" />
              Data Summary
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">
                  {summary.num_rows.toLocaleString()}
                </div>
                <div className="text-gray-600">Total Rows</div>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="text-2xl font-bold text-green-600">
                  {summary.num_columns}
                </div>
                <div className="text-gray-600">Total Columns</div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full border-collapse border border-gray-200">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="border border-gray-200 px-4 py-2 text-left">
                      Column
                    </th>
                    <th className="border border-gray-200 px-4 py-2 text-left">
                      Data Type
                    </th>
                    <th className="border border-gray-200 px-4 py-2 text-left">
                      Missing Values
                    </th>
                    <th className="border border-gray-200 px-4 py-2 text-left">
                      Unique Values
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {summary.columns.map((col, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="border border-gray-200 px-4 py-2 font-medium">
                        {col.column}
                      </td>
                      <td className="border border-gray-200 px-4 py-2">
                        <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded text-xs">
                          {col.dtype}
                        </span>
                      </td>
                      <td className="border border-gray-200 px-4 py-2">
                        <span
                          className={`font-medium ${
                            col.missing > 0 ? "text-red-600" : "text-green-600"
                          }`}
                        >
                          {col.missing}
                        </span>
                      </td>
                      <td className="border border-gray-200 px-4 py-2">
                        {col.unique.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {renderSummaryChart()}
          </div>
        )}

        {/* Aggregation Section */}
        {columns.length > 0 && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-2xl font-semibold text-gray-800 mb-4 flex items-center">
              <BarChart3 className="w-6 h-6 mr-2" />
              Data Aggregation
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Categorical Column
                </label>
                <select
                  value={catCol}
                  onChange={(e) => setCatCol(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Select column...</option>
                  {getStringColumns().map((col) => (
                    <option key={col} value={col}>
                      {col}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Continuous Column
                </label>
                <select
                  value={conCol}
                  onChange={(e) => setConCol(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Select column...</option>
                  {getNumericColumns().map((col) => (
                    <option key={col} value={col}>
                      {col}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Aggregation Function
                </label>
                <select
                  value={aggFunc}
                  onChange={(e) => setAggFunc(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  {aggFunctions.map((func) => (
                    <option key={func} value={func}>
                      {func}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-end">
                <button
                  onClick={performAggregation}
                  disabled={loading || !catCol || !conCol}
                  className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-colors"
                >
                  {loading ? (
                    <Loader className="animate-spin w-4 h-4" />
                  ) : (
                    <BarChart3 className="w-4 h-4" />
                  )}
                  Aggregate
                </button>
              </div>
            </div>

            {aggregationResult && (
              <div className="mt-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-3">
                  Aggregation Results: {aggFunc}(
                  {Object.keys(aggregationResult.aggregate)[0]}) by{" "}
                  {aggregationResult.group_by}
                </h3>

                <div className="overflow-x-auto mb-6">
                  <table className="w-full border-collapse border border-gray-200">
                    <thead>
                      <tr className="bg-gray-50">
                        <th className="border border-gray-200 px-4 py-2 text-left">
                          {aggregationResult.group_by}
                        </th>
                        <th className="border border-gray-200 px-4 py-2 text-left">
                          {Object.keys(aggregationResult.data).find((key) =>
                            key.includes("_")
                          )}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {aggregationResult.data[aggregationResult.group_by].map(
                        (group, index) => (
                          <tr key={index} className="hover:bg-gray-50">
                            <td className="border border-gray-200 px-4 py-2 font-medium">
                              {group}
                            </td>
                            <td className="border border-gray-200 px-4 py-2">
                              {Object.values(aggregationResult.data)[1][index]}
                            </td>
                          </tr>
                        )
                      )}
                    </tbody>
                  </table>
                </div>

                {renderAggregationChart()}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default EDAApp;
