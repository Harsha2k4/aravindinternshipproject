import { useEffect, useState, useRef } from "react";
import { Paginator, type PaginatorPageChangeEvent } from "primereact/paginator";
import { OverlayPanel } from "primereact/overlaypanel";
import { InputNumber, type InputNumberValueChangeEvent } from "primereact/inputnumber";
import { Button } from "primereact/button";
import "./App.css";

interface Artwork {
  id: number;
  title: string;
  artist_title?: string;
}

interface ApiResponse {
  data: Artwork[];
  pagination: {
    total: number;
    current_page: number;
    total_pages: number;
    limit: number;
  };
}

function App() {
  const [data, setData] = useState<Artwork[]>([]);
  const [totalRecords, setTotalRecords] = useState<number>(0);
  const [first, setFirst] = useState<number>(0);  // paginator index
  const [rows, setRows] = useState<number>(10);   // per page
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [selectCount, setSelectCount] = useState<number>(0);
  
  // Log data changes
  useEffect(() => {
    console.log('Total Items:', data.length);
  }, [data]);

  const op = useRef<OverlayPanel>(null);

  // Fetch data from API
  const fetchData = async (page: number = 1) => {
    try {
      const res = await fetch(`https://api.artic.edu/api/v1/artworks?page=${page}&limit=${rows}`);
      const json: ApiResponse = await res.json();
      console.group('API Response');
      console.log('Page:', page);
      console.log('Items per page:', rows);
      console.log('Response Data:', json);
      console.groupEnd();
      
      setData(json.data || []);
      setTotalRecords(json.pagination?.total || 100);
    } catch (err) {
      console.error("Error fetching:", err);
    }
  };

  useEffect(() => {
    const currentPage = Math.floor(first / rows) + 1;
    fetchData(currentPage);
  }, [first, rows]);

  // Toggle single row
  const toggleSelect = (id: number) => {
    const newSet = new Set(selected);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelected(newSet);
  };

  // Toggle select all (current page only)
  const toggleSelectAll = () => {
    const allSelected = data.length > 0 && data.every((item) => selected.has(item.id));
    const newSet = new Set(selected);
    
    if (allSelected) {
      // Deselect all items on current page
      data.forEach((item) => newSet.delete(item.id));
    } else {
      // Select all items on current page that aren't already selected
      data.forEach((item) => newSet.add(item.id));
    }
    setSelected(newSet);
  };

  // Track how many more items we need to select across pages
  const [remainingToSelect, setRemainingToSelect] = useState<number>(0);
  const [isSelecting, setIsSelecting] = useState<boolean>(false);

  // Handle selection of N items across pagination
  const handleSelectN = () => {
    if (selectCount <= 0) {
      op.current?.hide();
      return;
    }
    
    setRemainingToSelect(selectCount);
    setIsSelecting(true);
    setSelectCount(0);
    op.current?.hide();
  };

  // Effect to handle selection across pagination
  useEffect(() => {
    if (!isSelecting || remainingToSelect <= 0) return;
    
    const newSet = new Set(selected);
    let selectedInThisPage = 0;
    
    // Select items from current page until we've selected enough or reached the end of the page
    for (const item of data) {
      if (selectedInThisPage >= remainingToSelect) break;
      if (!newSet.has(item.id)) {
        newSet.add(item.id);
        selectedInThisPage++;
      }
    }
    
    setSelected(newSet);
    setRemainingToSelect(prev => prev - selectedInThisPage);
    
    // If we still have items to select and we've reached the end of the current page,
    // move to the next page
    if (remainingToSelect > selectedInThisPage && data.length > 0) {
      const currentPage = Math.floor(first / rows) + 1;
      const totalPages = Math.ceil(totalRecords / rows);
      
      if (currentPage < totalPages) {
        setFirst(prev => prev + rows);
      } else {
        // We've reached the last page
        setIsSelecting(false);
      }
    } else if (remainingToSelect <= selectedInThisPage) {
      // We've selected all requested items
      setIsSelecting(false);
    }
  }, [data, first, isSelecting, remainingToSelect, rows, selected, totalRecords]);

  // Get current page number based on first and rows
  const currentPage = Math.floor(first / rows) + 1;
  
  // Get total pages for pagination
  const totalPages = Math.ceil(totalRecords / rows);
  
  // Handle page change with boundary checks
  const handlePageChange = (e: PaginatorPageChangeEvent) => {
    const newPage = Math.floor(e.first / e.rows) + 1;
    if (newPage >= 1 && newPage <= totalPages) {
      setFirst(e.first);
      setRows(e.rows);
    }
  };

  return (
    <div className="App">
      <div className="header">
        <h2>Artworks</h2>
        <div className="selection-info">
          {selected.size > 0 && (
            <span className="selected-count">
              {selected.size} item{selected.size !== 1 ? 's' : ''} selected
            </span>
          )}
        </div>
      </div>
      <div className="table-header">
        <div className="selection-controls">
          <Button
            label="Select rows..."
            onClick={(e) => op.current?.toggle(e)}
            className="p-button-outlined p-button-sm"
            icon="pi pi-list"
          />
          <OverlayPanel ref={op} dismissable>
            <div className="overlay-content">
              <span className="p-float-label" style={{ marginRight: '0.5rem' }}>
                <InputNumber
                  id="row-count"
                  value={selectCount}
                  onValueChange={(e: InputNumberValueChangeEvent) => setSelectCount(e.value || 0)}
                  min={1}
                  max={rows}
                  showButtons
                  buttonLayout="horizontal"
                  incrementButtonIcon="pi pi-plus"
                  decrementButtonIcon="pi pi-minus"
                />
                <label htmlFor="row-count">Rows to select</label>
              </span>
              <Button 
                label="Apply" 
                onClick={handleSelectN} 
                className="p-button-sm"
                icon="pi pi-check"
              />
            </div>
          </OverlayPanel>
          
          {selected.size > 0 && (
            <Button
              label={`Clear (${selected.size})`}
              onClick={() => setSelected(new Set())}
              className="p-button-outlined p-button-sm p-button-danger"
              icon="pi pi-times"
              style={{ marginLeft: '0.5rem' }}
            />
          )}
        </div>
        
        <div className="pagination-info">
          Page {currentPage} of {totalPages}
        </div>
      </div>

      <table>
        <thead>
          <tr>
            <th>
              <input
                type="checkbox"
                checked={data.length > 0 && data.every((item) => selected.has(item.id))}
                onChange={toggleSelectAll}
              />
            </th>
            <th>Title</th>
            <th>Artist</th>
          </tr>
        </thead>
        <tbody>
          {data.map((item) => (
            <tr key={item.id}>
              <td>
                <input
                  type="checkbox"
                  checked={selected.has(item.id)}
                  onChange={() => toggleSelect(item.id)}
                />
              </td>
              <td>{item.title}</td>
              <td>{item.artist_title ?? "Unknown"}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="pagination-container">
        <Paginator
          first={first}
          rows={rows}
          totalRecords={totalRecords}
          rowsPerPageOptions={[5, 10, 20]}
          onPageChange={handlePageChange}
          template={{
            layout: 'FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink RowsPerPageDropdown',
            RowsPerPageDropdown: () => {
              return (
                <div className="p-d-flex p-ai-center" style={{ marginLeft: 'auto' }}>
                  <label htmlFor="rowsPerPage" style={{ marginRight: '0.5rem' }}>Rows per page:</label>
                  <select 
                    id="rowsPerPage"
                    value={rows}
                    onChange={(e) => {
                      setRows(Number(e.target.value));
                      setFirst(0);
                    }}
                    className="p-inputtext p-component"
                    style={{
                      padding: '0.5rem',
                      borderRadius: '4px',
                      border: '1px solid #ced4da',
                      backgroundColor: '#fff'
                    }}
                  >
                    {[5, 10, 20].map(option => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </div>
              );
            }
          }}
        />
      </div>

      {selected.size > 0 && (
        <div className="selected-ids">
          <h4>Selected Artwork IDs ({selected.size}):</h4>
          <div className="selected-list">
            {Array.from(selected).map((id, index) => (
              <span key={id} className="selected-id">
                {id}{index < selected.size - 1 ? ', ' : ''}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
