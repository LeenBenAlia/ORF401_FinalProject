import React, { useState, useRef, useCallback, useEffect } from 'react';
import api, { formatApiError } from '../api';
import { useAuth } from '../auth';
import { usesStaticGithubPagesDemo } from '../githubPagesDemo';
import {
  appendDemoQuotes,
  buildDemoQuoteRecordsFromFiles,
  getDemoGroupNames,
  addDemoExtraGroup,
  getDemoProducts,
  addDemoProduct,
} from '../demoQuoteStore';

function mergeQuoteFiles(prev, added) {
  const map = new Map();
  for (const f of [...prev, ...added]) {
    if (f && f.name && /\.(pdf|xlsx|xls|csv|eml|txt)$/i.test(f.name)) {
      const key = `${f.name}-${f.size}-${f.lastModified}`;
      map.set(key, f);
    }
  }
  return Array.from(map.values());
}

function UploadQuote() {
  const { company } = useAuth();
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
  const [groups, setGroups] = useState(['default']);
  const [newFolderName, setNewFolderName] = useState('');
  const [lizSuggestions, setLizSuggestions] = useState([]);
  const [missingFields, setMissingFields] = useState([]);
  const [exportLayout, setExportLayout] = useState('same_sheet');
  const [groupBy, setGroupBy] = useState('supplier');
  const [outputMode, setOutputMode] = useState('excel');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [folderTileDrag, setFolderTileDrag] = useState(null);
  const [manualProductLine, setManualProductLine] = useState('');
  const [productCatalog, setProductCatalog] = useState([]);
  const [productTileDrag, setProductTileDrag] = useState(null);
  const [newProductLineName, setNewProductLineName] = useState('');

  const loadProductCatalog = useCallback(async () => {
    try {
      if (usesStaticGithubPagesDemo()) {
        if (!company?.id) {
          setProductCatalog([]);
          return;
        }
        setProductCatalog(getDemoProducts(company.id));
        return;
      }
      const res = await api.get('/products');
      setProductCatalog(res.data.products || []);
    } catch {
      setProductCatalog([]);
    }
  }, [company?.id]);

  const loadGroups = useCallback(async () => {
    try {
      if (usesStaticGithubPagesDemo()) {
        if (!company?.id) {
          setGroups(['default']);
          return;
        }
        const list = getDemoGroupNames(company.id);
        setGroups(list.length ? list : ['default']);
        setGroupKey((prev) => (list.includes(prev) ? prev : list[0]));
        return;
      }
      const res = await api.get('/groups');
      const list = res.data.groups?.length ? res.data.groups : ['default'];
      setGroups(list);
      setGroupKey((prev) => (list.includes(prev) ? prev : list[0]));
    } catch {
      setGroups(['default']);
    }
  }, [company?.id]);

  useEffect(() => {
    loadGroups();
  }, [loadGroups]);

  useEffect(() => {
    loadProductCatalog();
  }, [loadProductCatalog]);

  useEffect(() => {
    const onProductsChanged = () => loadProductCatalog();
    window.addEventListener('products:changed', onProductsChanged);
    return () => window.removeEventListener('products:changed', onProductsChanged);
  }, [loadProductCatalog]);

  const createProductLine = async () => {
    const name = newProductLineName.trim();
    if (!name) {
      setMessage('Enter a product line name to add.');
      return;
    }
    try {
      if (usesStaticGithubPagesDemo()) {
        if (!company?.id) {
          setMessage('Sign in with a demo account first.');
          return;
        }
        addDemoProduct(company.id, name);
        setNewProductLineName('');
        await loadProductCatalog();
        setManualProductLine(name);
        setMessage(`Product line “${name}” added — uploads will tag this line until you pick another.`);
        window.dispatchEvent(new CustomEvent('products:changed'));
        return;
      }
      await api.post('/products', { name });
      setNewProductLineName('');
      await loadProductCatalog();
      setManualProductLine(name);
      setMessage(`Product line “${name}” added — uploads will tag this line until you pick another.`);
      window.dispatchEvent(new CustomEvent('products:changed'));
    } catch (error) {
      setMessage(formatApiError(error));
    }
  };

  const createFolder = async () => {
    const name = newFolderName.trim();
    if (!name) {
      setMessage('Enter a folder name to create.');
      return;
    }
    try {
      if (usesStaticGithubPagesDemo()) {
        if (!company?.id) {
          setMessage('Sign in with a demo account first.');
          return;
        }
        addDemoExtraGroup(company.id, name);
        setNewFolderName('');
        await loadGroups();
        setGroupKey(name);
        setMessage(`Folder “${name}” created (preview). New uploads will save there.`);
        window.dispatchEvent(new CustomEvent('quotes:changed'));
        return;
      }
      await api.post('/groups', { name });
      setNewFolderName('');
      await loadGroups();
      setGroupKey(name);
      setMessage(`Folder “${name}” created. New uploads will save there.`);
    } catch (error) {
      setMessage(formatApiError(error));
    }
  };

  const addFilesFromList = useCallback((fileList) => {
    const next = Array.from(fileList || []).filter(
      (f) => f.name && /\.(pdf|xlsx|xls|csv|eml|txt)$/i.test(f.name)
    );
    if (!next.length) {
      setMessage('Please add PDF, Excel, CSV, EML, or TXT quote files.');
      return;
    }
    setFiles((prev) => mergeQuoteFiles(prev, next));
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
      setMessage('Please choose at least one quote file first.');
      return;
    }
    if (usesStaticGithubPagesDemo()) {
      if (!company?.id) {
        setMessage('Sign in with a demo account (Tesla / SpaceX / Nvidia on the login page) before uploading.');
        return;
      }
      setUploading(true);
      try {
        const rows = buildDemoQuoteRecordsFromFiles(files, {
          companyId: company.id,
          groupKey,
          productName,
          manualProductLine,
        });
        appendDemoQuotes(rows);
        setMessage(
          `Preview: digitized ${rows.length} file(s) in your browser (GitHub Pages has no server). Data resets when you close the tab. Saved to folder “${groupKey}”.`
        );
        setData(rows);
        await loadGroups();
        window.dispatchEvent(new CustomEvent('quotes:changed'));
      } finally {
        setUploading(false);
      }
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
    formData.append('manual_product', manualProductLine.trim());

    try {
      setUploading(true);
      const response = await api.post('upload', formData);
      const base = response.data.message || 'Upload successful';
      setMessage(`${base} Saved to folder “${groupKey}”.`);
      setData(response.data.data || []);
      await loadGroups();
      window.dispatchEvent(new CustomEvent('quotes:changed'));
    } catch (error) {
      setMessage(`Upload failed: ${formatApiError(error)}`);
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
      <div className="upload-head">
        <h2>Digitize supplier quote files</h2>
        <div className="file-type-chips">
          <span className="chip">PDF</span>
          <span className="chip">Excel / CSV</span>
          <span className="chip">Email export</span>
        </div>
      </div>
      <p className="muted">
        Add one or many files in a single action: PDF, Excel, CSV, or email-export files (EML/TXT).
        Multi-select in the file dialog (Shift- or Cmd/Ctrl-click), drop files
        here, or use <strong>Choose quote files</strong> again to append more.
      </p>
      {usesStaticGithubPagesDemo() && (
        <p className="quote-library-api-note" role="note">
          <strong>GitHub Pages preview:</strong> uploads are simulated in your browser (no PDF parsing on a server). Use a demo login, then upload to see quotes on the library and dashboard. For real extraction, run the FastAPI app locally or set the{' '}
          <code className="quote-library-code">REACT_APP_API_BASE_URL</code> secret and redeploy.
        </p>
      )}

      <div className="upload-folder-bar">
        <div className="upload-folder-bar__head">
          <span className="upload-folder-bar__title">Save uploads to folder</span>
          <p className="muted upload-folder-bar__lede">
            Pick an existing folder or create one; scanned files are tagged so they appear under that folder in your quote library.
          </p>
        </div>
        <div
          className="upload-folder-tiles"
          role="group"
          aria-label="Choose folder; you can also drop quote files onto a folder"
        >
          {groups.map((g) => (
            <button
              key={g}
              type="button"
              className={`upload-folder-tile${groupKey === g ? " upload-folder-tile--active" : ""}${
                folderTileDrag === g ? " upload-folder-tile--dropping" : ""
              }`}
              onClick={() => setGroupKey(g)}
              onDragEnter={(e) => {
                e.preventDefault();
                setFolderTileDrag(g);
              }}
              onDragOver={(e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = "copy";
              }}
              onDragLeave={(e) => {
                if (!e.currentTarget.contains(e.relatedTarget)) {
                  setFolderTileDrag((cur) => (cur === g ? null : cur));
                }
              }}
              onDrop={(e) => {
                e.preventDefault();
                setFolderTileDrag(null);
                setGroupKey(g);
                if (e.dataTransfer?.files?.length) {
                  addFilesFromList(e.dataTransfer.files);
                  setMessage(`Files added for upload to folder “${g}”.`);
                }
              }}
            >
              <span className="upload-folder-tile__name">{g}</span>
              {groupKey === g && <span className="upload-folder-tile__badge">selected</span>}
            </button>
          ))}
        </div>
        <div className="upload-row upload-folder-bar__row">
          <input
            type="text"
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                createFolder();
              }
            }}
            placeholder="New folder name"
            aria-label="New folder name"
          />
          <button type="button" className="btn-minimal" onClick={createFolder}>
            Create folder
          </button>
        </div>
      </div>

      <div className="upload-folder-bar upload-product-bar">
        <div className="upload-folder-bar__head">
          <span className="upload-folder-bar__title">Product line (optional)</span>
          <p className="muted upload-folder-bar__lede">
            Tag uploads so the dashboard groups quotes under your product names. Add lines on the dashboard or here; drop files onto a
            tile to queue them under that product and folder.
          </p>
        </div>
        <div className="upload-folder-tiles" role="group" aria-label="Choose product line for uploads">
          <button
            type="button"
            className={`upload-folder-tile upload-folder-tile--product${manualProductLine === '' ? ' upload-folder-tile--active' : ''}${productTileDrag === '__none__' ? ' upload-folder-tile--dropping' : ''}`}
            onClick={() => setManualProductLine('')}
            onDragEnter={(e) => {
              e.preventDefault();
              setProductTileDrag('__none__');
            }}
            onDragOver={(e) => {
              e.preventDefault();
              e.dataTransfer.dropEffect = 'copy';
            }}
            onDragLeave={(e) => {
              if (!e.currentTarget.contains(e.relatedTarget)) {
                setProductTileDrag((cur) => (cur === '__none__' ? null : cur));
              }
            }}
            onDrop={(e) => {
              e.preventDefault();
              setProductTileDrag(null);
              setManualProductLine('');
              if (e.dataTransfer?.files?.length) {
                addFilesFromList(e.dataTransfer.files);
                setMessage('Files added — product line follows extraction text.');
              }
            }}
          >
            <span className="upload-folder-tile__name">From extraction</span>
            {manualProductLine === '' && <span className="upload-folder-tile__badge">selected</span>}
          </button>
          {productCatalog.map((p) => (
            <button
              key={p}
              type="button"
              className={`upload-folder-tile upload-folder-tile--product${manualProductLine === p ? ' upload-folder-tile--active' : ''}${productTileDrag === p ? ' upload-folder-tile--dropping' : ''}`}
              onClick={() => setManualProductLine(p)}
              onDragEnter={(e) => {
                e.preventDefault();
                setProductTileDrag(p);
              }}
              onDragOver={(e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'copy';
              }}
              onDragLeave={(e) => {
                if (!e.currentTarget.contains(e.relatedTarget)) {
                  setProductTileDrag((cur) => (cur === p ? null : cur));
                }
              }}
              onDrop={(e) => {
                e.preventDefault();
                setProductTileDrag(null);
                setManualProductLine(p);
                if (e.dataTransfer?.files?.length) {
                  addFilesFromList(e.dataTransfer.files);
                  setMessage(`Files added — tagged to product line “${p}”.`);
                }
              }}
            >
              <span className="upload-folder-tile__name">{p}</span>
              {manualProductLine === p && <span className="upload-folder-tile__badge">selected</span>}
            </button>
          ))}
        </div>
        <div className="upload-row upload-folder-bar__row">
          <input
            type="text"
            value={newProductLineName}
            onChange={(e) => setNewProductLineName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                createProductLine();
              }
            }}
            placeholder="New product line name"
            aria-label="New product line name"
          />
          <button type="button" className="btn-minimal" onClick={createProductLine}>
            Add product line
          </button>
        </div>
      </div>

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
          accept="application/pdf,.pdf,.xlsx,.xls,.csv,.eml,.txt,message/rfc822,text/plain"
          multiple
          onChange={handleFileChange}
          className="upload-file-input"
          id="upload-quotes-input"
        />
        <div className="upload-dropzone__actions">
          <button type="button" className="btn-upload-pick" onClick={() => fileInputRef.current?.click()}>
            Choose quote files
          </button>
          <span className="upload-dropzone__or">or drag and drop</span>
        </div>
        <p className="upload-hint muted">Multiple files supported — all selected quote files upload together.</p>
        <div className="upload-dropzone__footer">
          <button className="btn-upload-go" onClick={handleUpload} disabled={uploading} type="button">
            {uploading ? 'Uploading…' : `Upload ${files.length > 0 ? `(${files.length})` : ''}`}
          </button>
          <button
            type="button"
            className="btn-upload-clear"
            onClick={() => setFiles([])}
            disabled={!files.length || uploading}
          >
            Clear
          </button>
        </div>
      </div>

      {files.length > 0 && (
        <ul className="upload-file-list" aria-label="Selected quote files">
          {files.map((f) => (
            <li key={`${f.name}-${f.size}-${f.lastModified}`}>{f.name}</li>
          ))}
        </ul>
      )}

      <div className="upload-row">
        <button
          type="button"
          className="btn-minimal"
          onClick={() => setShowAdvanced((prev) => !prev)}
        >
          {showAdvanced ? 'Hide advanced options' : 'Show advanced options'}
        </button>
      </div>

      {showAdvanced && (
        <>
          <div className="form-grid">
            <label>
              Product name
              <input value={productName} onChange={(e) => setProductName(e.target.value)} />
            </label>
            <label>
              Output mode
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
        </>
      )}

      {lizSuggestions.length > 0 && (
        <div className="results-card">
          <h3>Liz recommendations</h3>
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