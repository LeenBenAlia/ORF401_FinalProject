import React, { useState, useRef, useCallback } from 'react';
import api from '../api';

function mergePdfFiles(prev, added) {
  const map = new Map();
  for (const f of [...prev, ...added]) {
    if (f && f.name && f.name.toLowerCase().endsWith('.pdf')) {
      const key = `${f.name}-${f.size}-${f.lastModified}`;
      map.set(key, f);
    }
  }
  return Array.from(map.values());
}

function UploadQuote() {
  const [files, setFiles] = useState([]);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef(null);
  const [message, setMessage] = useState('');
  const [data, setData] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [manualFieldsInput, setManualFieldsInput] = useState('');
  const [useLiz, setUseLiz] = useState(true);
  const [productName, setProductName] = useState('');
  const [productDescription, setProductDescription] = useState('');
  const [groupKey, setGroupKey] = useState('default');
  const [lizSuggestions, setLizSuggestions] = useState([]);
  const [missingFields, setMissingFields] = useState([]);
  const [exportLayout, setExportLayout] = useState('same_sheet');
  const [groupBy, setGroupBy] = useState('supplier');
  const [outputMode, setOutputMode] = useState('excel');

  const addFilesFromList = useCallback((fileList) => {
    const next = Array.from(fileList || []).filter(
      (f) => f.name && f.name.toLowerCase().endsWith('.pdf')
    );
    if (!next.length) {
      setMessage('Please add PDF files only.');
      return;
    }
    setFiles((prev) => mergePdfFiles(prev, next));
    setMessage('');
  }, []);

  const handleFileChange = (e) => {
    addFilesFromList(e.target.files);
    e.target.value = '';
  };

  const onDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer?.files?.length) {
      addFilesFromList(e.dataTransfer.files);
    }
  };

  const onDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  };

  const parseManualFields = () =>
    manualFieldsInput
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);

  const fetchLizSuggestions = async () => {
    try {
      const response = await api.post('liz/recommend-fields', {
        product_name: productName,
        product_description: productDescription,
        existing_fields: parseManualFields(),
      });
      setLizSuggestions(response.data.recommended_fields || []);
      setMissingFields(response.data.missing_fields || []);
    } catch (error) {
      setMessage(`Liz recommendations failed: ${error.message}`);
    }
  };

  const handleUpload = async () => {
    if (!files.length) {
      setMessage('Please choose at least one PDF quote first.');
      return;
    }

    const formData = new FormData();
    files.forEach((file) => formData.append('files', file));
    formData.append('manual_fields', JSON.stringify(parseManualFields()));
    formData.append('use_liz_recommendations', String(useLiz));
    formData.append('product_name', productName);
    formData.append('product_description', productDescription);
    formData.append('group_key', groupKey);
    formData.append('output_mode', outputMode);

    try {
      setUploading(true);
      const response = await api.post('upload', formData);
      setMessage(response.data.message || 'Upload successful');
      setData(response.data.data || []);
    } catch (error) {
      const detail = error?.response?.data?.detail;
      setMessage(`Upload failed: ${detail || error.message}`);
    } finally {
      setUploading(false);
    }
  };

  const handleExportExcel = async () => {
    try {
      const response = await api.post('export/excel', {
        quote_ids: data.map((item) => item.id),
        export_layout: exportLayout,
        group_by: groupBy,
      }, {
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'quotes.xlsx');
      document.body.appendChild(link);
      link.click();
    } catch (error) {
      alert('Export failed');
    }
  };

  return (
    <section className="upload-card">
      <h2>Upload Supplier Quote PDFs</h2>
      <p className="muted">
        Add one or many PDFs in a single action: multi-select in the file dialog (Shift- or Cmd/Ctrl-click), drop files
        here, or use <strong>Choose PDFs</strong> again to append more.
      </p>

      <div
        className={`upload-dropzone${dragOver ? ' upload-dropzone--active' : ''}`}
        onDrop={onDrop}
        onDragOver={onDragOver}
        onDragEnter={() => setDragOver(true)}
        onDragLeave={() => setDragOver(false)}
        role="presentation"
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="application/pdf,.pdf"
          multiple
          onChange={handleFileChange}
          className="upload-file-input"
          id="upload-quotes-input"
        />
        <div className="upload-dropzone__actions">
          <button type="button" className="btn-upload-pick" onClick={() => fileInputRef.current?.click()}>
            Choose PDFs
          </button>
          <span className="upload-dropzone__or">or drag and drop</span>
        </div>
        <p className="upload-hint muted">Multiple files supported — all selected PDFs upload together.</p>
        <button className="btn-upload-go" onClick={handleUpload} disabled={uploading} type="button">
          {uploading ? 'Uploading…' : `Upload ${files.length > 0 ? `(${files.length})` : ''}`}
        </button>
      </div>

      {files.length > 0 && (
        <ul className="upload-file-list" aria-label="Selected PDFs">
          {files.map((f) => (
            <li key={`${f.name}-${f.size}-${f.lastModified}`}>{f.name}</li>
          ))}
        </ul>
      )}

      <div className="form-grid">
        <label>
          Product name
          <input value={productName} onChange={(e) => setProductName(e.target.value)} />
        </label>
        <label>
          Group key
          <input value={groupKey} onChange={(e) => setGroupKey(e.target.value)} />
        </label>
        <label>
          Liz output mode
          <select value={outputMode} onChange={(e) => setOutputMode(e.target.value)}>
            <option value="excel">Excel-ready output</option>
            <option value="code">Code/JSON output</option>
          </select>
        </label>
      </div>
      <label>
        Product description (Liz uses this to recommend fields)
        <textarea
          value={productDescription}
          onChange={(e) => setProductDescription(e.target.value)}
          rows={3}
        />
      </label>
      <label>
        Manual fields (comma separated)
        <input
          value={manualFieldsInput}
          onChange={(e) => setManualFieldsInput(e.target.value)}
          placeholder="weight, dimensions, country_of_origin, chemical_composition"
        />
      </label>

      <div className="upload-row">
        <label className="checkbox-row">
          <input type="checkbox" checked={useLiz} onChange={(e) => setUseLiz(e.target.checked)} />
          Enable Liz AI field suggestions
        </label>
        <button type="button" onClick={fetchLizSuggestions}>Ask Liz for recommended fields</button>
      </div>

      {lizSuggestions.length > 0 && (
        <div className="results-card">
          <h3>Liz Recommendations</h3>
          <p><strong>Suggested fields:</strong> {lizSuggestions.join(', ')}</p>
          <p><strong>Missing from your manual fields:</strong> {missingFields.join(', ') || 'None'}</p>
        </div>
      )}

      <p>{message}</p>

      {data.length > 0 && (
        <div className="results-card">
          <h3>Digitized Quote Data ({data.length} files)</h3>
          <pre>{JSON.stringify(data, null, 2)}</pre>
          <div className="form-grid">
            <label>
              Excel export layout
              <select value={exportLayout} onChange={(e) => setExportLayout(e.target.value)}>
                <option value="same_sheet">Same sheet</option>
                <option value="separate_sheets">Separate sheet per quote</option>
                <option value="grouped_sheets">Grouped sheets by parameter</option>
              </select>
            </label>
            <label>
              Group sheets by parameter
              <select value={groupBy} onChange={(e) => setGroupBy(e.target.value)}>
                <option value="supplier">Supplier</option>
                <option value="country">Country</option>
                <option value="material">Material</option>
                <option value="group_key">Group key</option>
                <option value="product">Product</option>
              </select>
            </label>
          </div>
          <button onClick={handleExportExcel}>Export to Excel</button>
        </div>
      )}
    </section>
  );
}

export default UploadQuote;