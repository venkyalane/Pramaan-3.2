import React from 'react';
import { EditableField } from './FormComponents';
import { Tooltip, IconButton } from '@mui/material';
import LibraryBooksIcon from '@mui/icons-material/LibraryBooks';

const stripDollar = (val) => {
  if (val === undefined || val === null) return '';
  return String(val).replace(/\$/g, '').trim();
};

const ComparableRentScheduleTable = ({
  data = {},
  allData = {},
  comparableRents = [
    'COMPARABLE NO. 1',
    'COMPARABLE NO. 2',
    'COMPARABLE NO. 3',
  ],
  extractionAttempted = false,
  handleDataChange,
  editingField,
  setEditingField,
  manualValidations,
  handleManualValidation,
  revisionHandlers = {},
  on1007RevisionButtonClick,
  isEditable = true,
}) => {
  // Show at least the first 3 rental columns, plus any subsequent ones that have data
  const activeComparableRents = (comparableRents || []).filter((rent, idx) => {
    const rentData = (data && data[rent]) || (allData && allData[rent]);
    if (!rentData) return idx < 3;
    const hasVal = Object.values(rentData).some(
      (val) => val !== undefined && val !== null && String(val).trim() !== ''
    );
    return hasVal || idx < 3;
  });

  const subjectData = data.Subject || data.SUBJECT || {};

  return (
    <div id="rent-schedule-section" style={{ marginBottom: '1rem', marginTop: '1rem' }} className="card shadow mb-4">
      <div className="card-header CAR1 bg-info text-white" style={{ position: 'sticky', top: 0, zIndex: 10 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <strong>Comparable Rent Schedule</strong>
          {on1007RevisionButtonClick && (
            <Tooltip title="Revision Language">
              <IconButton onClick={on1007RevisionButtonClick} size="small" sx={{ color: 'white', marginLeft: 'auto' }}>
                <LibraryBooksIcon />
              </IconButton>
            </Tooltip>
          )}
        </div>
      </div>
      <div className="card-body p-0 table-container">
        <table className="table table-bordered mb-0" style={{ fontSize: '0.8rem', borderCollapse: 'collapse' }}>
          <thead className="table-light">
            <tr>
              <th className="border border-gray-400 p-1 bg-gray-200 align-middle" style={{ width: '20%' }}>ITEM</th>
              <th className="border border-gray-400 p-1 bg-gray-200 align-middle" style={{ width: '20%' }}>SUBJECT</th>
              {activeComparableRents.map((rent, idx) => (
                <th key={idx} colSpan={2} className="border border-gray-400 p-1 bg-gray-200 text-center align-middle">
                  {rent}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {/* Address */}
            <tr>
              <td className="border border-gray-400 p-2 font-medium bg-light">Address</td>
              <td className="border border-gray-400 p-1">
                <EditableField
                  fieldPath={['Subject', 'Address']}
                  value={subjectData['Address'] || ''}
                  onDataChange={handleDataChange}
                  editingField={editingField}
                  setEditingField={setEditingField}
                  isMissing={extractionAttempted && !subjectData['Address']}
                  isEditable={isEditable}
                  manualValidations={manualValidations}
                  revisionHandlers={revisionHandlers}
                  handleManualValidation={handleManualValidation}
                  allData={allData}
                  saleName={'Subject'}
                />
              </td>
              {activeComparableRents.map((rent, idx) => (
                <td key={idx} colSpan={2} className="border border-gray-400 p-1">
                  <EditableField
                    fieldPath={[rent, 'Address']}
                    value={(data[rent] && data[rent]['Address']) || ''}
                    onDataChange={handleDataChange}
                    editingField={editingField}
                    setEditingField={setEditingField}
                    isMissing={extractionAttempted && (!data[rent] || !data[rent]['Address'])}
                    isEditable={isEditable}
                    manualValidations={manualValidations}
                    revisionHandlers={revisionHandlers}
                    handleManualValidation={handleManualValidation}
                    allData={allData}
                    saleName={rent}
                  />
                </td>
              ))}
            </tr>

            {/* Proximity to Subject */}
            <tr>
              <td className="border border-gray-400 p-2 font-medium bg-light">Proximity to Subject</td>
              <td className="border border-gray-400 p-1 bg-gray-200" style={{ backgroundColor: '#e9ecef' }}></td>
              {activeComparableRents.map((rent, idx) => (
                <td key={idx} colSpan={2} className="border border-gray-400 p-1">
                  <EditableField
                    fieldPath={[rent, 'Proximity to Subject']}
                    value={(data[rent] && data[rent]['Proximity to Subject']) || ''}
                    onDataChange={handleDataChange}
                    editingField={editingField}
                    setEditingField={setEditingField}
                    isMissing={extractionAttempted && (!data[rent] || !data[rent]['Proximity to Subject'])}
                    isEditable={isEditable}
                    manualValidations={manualValidations}
                    revisionHandlers={revisionHandlers}
                    handleManualValidation={handleManualValidation}
                    allData={allData}
                    saleName={rent}
                  />
                </td>
              ))}
            </tr>

            {/* Lease Dates */}
            <tr>
              <td className="border border-gray-400 p-2 font-medium bg-light">
                <div>Date Lease Begins</div>
                <div className="text-muted" style={{ borderTop: '1px solid #dee2e6', marginTop: '4px', paddingTop: '4px' }}>Date Lease Expires</div>
              </td>
              <td className="border border-gray-400 p-1 bg-gray-200" style={{ backgroundColor: '#e9ecef' }}></td>
              {activeComparableRents.map((rent, idx) => (
                <td key={idx} colSpan={2} className="border border-gray-400 p-1">
                  <div>
                    <EditableField
                      fieldPath={[rent, 'Date Lease Begins']}
                      value={(data[rent] && data[rent]['Date Lease Begins']) || ''}
                      onDataChange={handleDataChange}
                      editingField={editingField}
                      setEditingField={setEditingField}
                      isMissing={extractionAttempted && (!data[rent] || !data[rent]['Date Lease Begins'])}
                      isEditable={isEditable}
                      manualValidations={manualValidations}
                      revisionHandlers={revisionHandlers}
                      handleManualValidation={handleManualValidation}
                      allData={allData}
                      saleName={rent}
                    />
                  </div>
                  <div style={{ borderTop: '1px solid #dee2e6', marginTop: '4px', paddingTop: '4px' }}>
                    <EditableField
                      fieldPath={[rent, 'Date Lease Expires']}
                      value={(data[rent] && data[rent]['Date Lease Expires']) || ''}
                      onDataChange={handleDataChange}
                      editingField={editingField}
                      setEditingField={setEditingField}
                      isMissing={extractionAttempted && (!data[rent] || !data[rent]['Date Lease Expires'])}
                      isEditable={isEditable}
                      manualValidations={manualValidations}
                      revisionHandlers={revisionHandlers}
                      handleManualValidation={handleManualValidation}
                      allData={allData}
                      saleName={rent}
                    />
                  </div>
                </td>
              ))}
            </tr>

            {/* Monthly Rental */}
            <tr>
              <td className="border border-gray-400 p-2 font-medium bg-light">Monthly Rental</td>
              <td className="border border-gray-400 p-1">
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span style={{ fontSize: '0.75rem', whiteSpace: 'nowrap' }}>If Currently Rented: $</span>
                  <EditableField
                    fieldPath={['Subject', 'Monthly Rental']}
                    value={stripDollar(subjectData['Monthly Rental'])}
                    onDataChange={handleDataChange}
                    editingField={editingField}
                    setEditingField={setEditingField}
                    isMissing={extractionAttempted && !subjectData['Monthly Rental']}
                    isEditable={isEditable}
                    manualValidations={manualValidations}
                    revisionHandlers={revisionHandlers}
                    handleManualValidation={handleManualValidation}
                    allData={allData}
                    saleName={'Subject'}
                  />
                </div>
              </td>
              {activeComparableRents.map((rent, idx) => (
                <td key={idx} colSpan={2} className="border border-gray-400 p-1">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span>$</span>
                    <EditableField
                      fieldPath={[rent, 'Monthly Rental']}
                      value={stripDollar(data[rent] && data[rent]['Monthly Rental'])}
                      onDataChange={handleDataChange}
                      editingField={editingField}
                      setEditingField={setEditingField}
                      isMissing={extractionAttempted && (!data[rent] || !data[rent]['Monthly Rental'])}
                      isEditable={isEditable}
                      manualValidations={manualValidations}
                      revisionHandlers={revisionHandlers}
                      handleManualValidation={handleManualValidation}
                      allData={allData}
                      saleName={rent}
                    />
                  </div>
                </td>
              ))}
            </tr>

            {/* Less: Utilities & Furniture */}
            <tr>
              <td className="border border-gray-400 p-2 font-medium bg-light">
                <div>Less: Utilities</div>
                <div className="text-muted" style={{ borderTop: '1px solid #dee2e6', marginTop: '4px', paddingTop: '4px' }}>Furniture</div>
              </td>
              <td className="border border-gray-400 p-1">
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span>$</span>
                  <EditableField
                    fieldPath={['Subject', 'Less: Utilities']}
                    value={stripDollar(subjectData['Less: Utilities'])}
                    onDataChange={handleDataChange}
                    editingField={editingField}
                    setEditingField={setEditingField}
                    isMissing={extractionAttempted && !subjectData['Less: Utilities']}
                    isEditable={isEditable}
                    manualValidations={manualValidations}
                    revisionHandlers={revisionHandlers}
                    handleManualValidation={handleManualValidation}
                    allData={allData}
                    saleName={'Subject'}
                  />
                </div>
                <div style={{ borderTop: '1px solid #dee2e6', marginTop: '4px', paddingTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <EditableField
                    fieldPath={['Subject', 'Furniture']}
                    value={subjectData['Furniture'] || ''}
                    onDataChange={handleDataChange}
                    editingField={editingField}
                    setEditingField={setEditingField}
                    isMissing={extractionAttempted && !subjectData['Furniture']}
                    isEditable={isEditable}
                    manualValidations={manualValidations}
                    revisionHandlers={revisionHandlers}
                    handleManualValidation={handleManualValidation}
                    allData={allData}
                    saleName={'Subject'}
                  />
                </div>
              </td>
              {activeComparableRents.map((rent, idx) => (
                <td key={idx} colSpan={2} className="border border-gray-400 p-1">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span>$</span>
                    <EditableField
                      fieldPath={[rent, 'Less: Utilities']}
                      value={stripDollar(data[rent] && data[rent]['Less: Utilities'])}
                      onDataChange={handleDataChange}
                      editingField={editingField}
                      setEditingField={setEditingField}
                      isMissing={extractionAttempted && (!data[rent] || !data[rent]['Less: Utilities'])}
                      isEditable={isEditable}
                      manualValidations={manualValidations}
                      revisionHandlers={revisionHandlers}
                      handleManualValidation={handleManualValidation}
                      allData={allData}
                      saleName={rent}
                    />
                  </div>
                  <div style={{ borderTop: '1px solid #dee2e6', marginTop: '4px', paddingTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <EditableField
                      fieldPath={[rent, 'Furniture']}
                      value={(data[rent] && data[rent]['Furniture']) || ''}
                      onDataChange={handleDataChange}
                      editingField={editingField}
                      setEditingField={setEditingField}
                      isMissing={extractionAttempted && (!data[rent] || !data[rent]['Furniture'])}
                      isEditable={isEditable}
                      manualValidations={manualValidations}
                      revisionHandlers={revisionHandlers}
                      handleManualValidation={handleManualValidation}
                      allData={allData}
                      saleName={rent}
                    />
                  </div>
                </td>
              ))}
            </tr>

            {/* Adjusted Monthly Rent */}
            <tr>
              <td className="border border-gray-400 p-2 font-medium bg-light">Adjusted Monthly Rent</td>
              <td className="border border-gray-400 p-1">
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span>$</span>
                  <EditableField
                    fieldPath={['Subject', 'Adjusted Monthly Rent']}
                    value={stripDollar(subjectData['Adjusted Monthly Rent'])}
                    onDataChange={handleDataChange}
                    editingField={editingField}
                    setEditingField={setEditingField}
                    isMissing={extractionAttempted && !subjectData['Adjusted Monthly Rent']}
                    isEditable={isEditable}
                    manualValidations={manualValidations}
                    revisionHandlers={revisionHandlers}
                    handleManualValidation={handleManualValidation}
                    allData={allData}
                    saleName={'Subject'}
                  />
                </div>
              </td>
              {activeComparableRents.map((rent, idx) => (
                <td key={idx} colSpan={2} className="border border-gray-400 p-1">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span>$</span>
                    <EditableField
                      fieldPath={[rent, 'Adjusted Monthly Rent']}
                      value={stripDollar(data[rent] && data[rent]['Adjusted Monthly Rent'])}
                      onDataChange={handleDataChange}
                      editingField={editingField}
                      setEditingField={setEditingField}
                      isMissing={extractionAttempted && (!data[rent] || !data[rent]['Adjusted Monthly Rent'])}
                      isEditable={isEditable}
                      manualValidations={manualValidations}
                      revisionHandlers={revisionHandlers}
                      handleManualValidation={handleManualValidation}
                      allData={allData}
                      saleName={rent}
                    />
                  </div>
                </td>
              ))}
            </tr>

            {/* Data Source */}
            <tr>
              <td className="border border-gray-400 p-2 font-medium bg-light">Data Source</td>
              <td className="border border-gray-400 p-1 bg-gray-200" style={{ backgroundColor: '#e9ecef' }}></td>
              {activeComparableRents.map((rent, idx) => (
                <td key={idx} colSpan={2} className="border border-gray-400 p-1">
                  <EditableField
                    fieldPath={[rent, 'Data Source']}
                    value={(data[rent] && data[rent]['Data Source']) || ''}
                    onDataChange={handleDataChange}
                    editingField={editingField}
                    setEditingField={setEditingField}
                    isMissing={extractionAttempted && (!data[rent] || !data[rent]['Data Source'])}
                    isEditable={isEditable}
                    manualValidations={manualValidations}
                    revisionHandlers={revisionHandlers}
                    handleManualValidation={handleManualValidation}
                    allData={allData}
                    saleName={rent}
                  />
                </td>
              ))}
            </tr>

            {/* VALUE ADJUSTMENTS HEADER */}
            <tr className="bg-light">
              <td className="border border-gray-400 p-2 font-bold" style={{ backgroundColor: '#f8f9fa' }}>RENT ADJUSTMENTS</td>
              <td className="border border-gray-400 p-2 font-bold" style={{ backgroundColor: '#f8f9fa' }}>DESCRIPTION</td>
              {activeComparableRents.map((rent, idx) => (
                <React.Fragment key={idx}>
                  <td className="border border-gray-400 p-2 font-bold text-center" style={{ width: '13%', backgroundColor: '#f8f9fa' }}>DESCRIPTION</td>
                  <td className="border border-gray-400 p-2 font-bold text-center" style={{ width: '7%', backgroundColor: '#f8f9fa' }}>+(-)$ Adjust.</td>
                </React.Fragment>
              ))}
            </tr>

            {/* Rent */}
            <tr>
              <td className="border border-gray-400 p-2 font-medium bg-light">Rent</td>
              <td className="border border-gray-400 p-1 bg-gray-200" style={{ backgroundColor: '#e9ecef' }}></td>
              {activeComparableRents.map((rent, idx) => (
                <React.Fragment key={idx}>
                  <td className="border border-gray-400 p-1">
                    <EditableField
                      fieldPath={[rent, 'Rent']}
                      value={(data[rent] && data[rent]['Rent']) || ''}
                      onDataChange={handleDataChange}
                      editingField={editingField}
                      setEditingField={setEditingField}
                      isMissing={extractionAttempted && (!data[rent] || !data[rent]['Rent'])}
                      isEditable={isEditable}
                      manualValidations={manualValidations}
                      revisionHandlers={revisionHandlers}
                      handleManualValidation={handleManualValidation}
                      allData={allData}
                      saleName={rent}
                    />
                  </td>
                  <td className="border border-gray-400 p-1 bg-gray-200" style={{ backgroundColor: '#e9ecef' }}></td>
                </React.Fragment>
              ))}
            </tr>

            {/* Concessions */}
            <tr>
              <td className="border border-gray-400 p-2 font-medium bg-light">Concessions</td>
              <td className="border border-gray-400 p-1 bg-gray-200" style={{ backgroundColor: '#e9ecef' }}></td>
              {activeComparableRents.map((rent, idx) => (
                <React.Fragment key={idx}>
                  <td className="border border-gray-400 p-1">
                    <EditableField
                      fieldPath={[rent, 'Concessions']}
                      value={(data[rent] && data[rent]['Concessions']) || ''}
                      onDataChange={handleDataChange}
                      editingField={editingField}
                      setEditingField={setEditingField}
                      isMissing={extractionAttempted && (!data[rent] || !data[rent]['Concessions'])}
                      isEditable={isEditable}
                      manualValidations={manualValidations}
                      revisionHandlers={revisionHandlers}
                      handleManualValidation={handleManualValidation}
                      allData={allData}
                      saleName={rent}
                    />
                  </td>
                  <td className="border border-gray-400 p-1 bg-gray-200" style={{ backgroundColor: '#e9ecef' }}></td>
                </React.Fragment>
              ))}
            </tr>

            {/* Location/View */}
            <tr>
              <td className="border border-gray-400 p-2 font-medium bg-light">Location/View</td>
              <td className="border border-gray-400 p-1">
                <EditableField
                  fieldPath={['Subject', 'Location/View']}
                  value={subjectData['Location/View'] || ''}
                  onDataChange={handleDataChange}
                  editingField={editingField}
                  setEditingField={setEditingField}
                  isMissing={extractionAttempted && !subjectData['Location/View']}
                  isEditable={isEditable}
                  manualValidations={manualValidations}
                  revisionHandlers={revisionHandlers}
                  handleManualValidation={handleManualValidation}
                  allData={allData}
                  saleName={'Subject'}
                />
              </td>
              {activeComparableRents.map((rent, idx) => (
                <React.Fragment key={idx}>
                  <td className="border border-gray-400 p-1">
                    <EditableField
                      fieldPath={[rent, 'Location/View']}
                      value={(data[rent] && data[rent]['Location/View']) || ''}
                      onDataChange={handleDataChange}
                      editingField={editingField}
                      setEditingField={setEditingField}
                      isMissing={extractionAttempted && (!data[rent] || !data[rent]['Location/View'])}
                      isEditable={isEditable}
                      manualValidations={manualValidations}
                      revisionHandlers={revisionHandlers}
                      handleManualValidation={handleManualValidation}
                      allData={allData}
                      saleName={rent}
                    />
                  </td>
                  <td className="border border-gray-400 p-1">
                    <EditableField
                      fieldPath={[rent, 'Location/View Adjustment']}
                      value={(data[rent] && data[rent]['Location/View Adjustment']) || ''}
                      onDataChange={handleDataChange}
                      editingField={editingField}
                      setEditingField={setEditingField}
                      isMissing={extractionAttempted && (!data[rent] || !data[rent]['Location/View Adjustment'])}
                      isEditable={isEditable}
                      manualValidations={manualValidations}
                      revisionHandlers={revisionHandlers}
                      handleManualValidation={handleManualValidation}
                      allData={allData}
                      saleName={rent}
                    />
                  </td>
                </React.Fragment>
              ))}
            </tr>

            {/* Design and Appeal */}
            <tr>
              <td className="border border-gray-400 p-2 font-medium bg-light">Design and Appeal</td>
              <td className="border border-gray-400 p-1">
                <EditableField
                  fieldPath={['Subject', 'Design and Appeal']}
                  value={subjectData['Design and Appeal'] || ''}
                  onDataChange={handleDataChange}
                  editingField={editingField}
                  setEditingField={setEditingField}
                  isMissing={extractionAttempted && !subjectData['Design and Appeal']}
                  isEditable={isEditable}
                  manualValidations={manualValidations}
                  revisionHandlers={revisionHandlers}
                  handleManualValidation={handleManualValidation}
                  allData={allData}
                  saleName={'Subject'}
                />
              </td>
              {activeComparableRents.map((rent, idx) => (
                <React.Fragment key={idx}>
                  <td className="border border-gray-400 p-1">
                    <EditableField
                      fieldPath={[rent, 'Design and Appeal']}
                      value={(data[rent] && data[rent]['Design and Appeal']) || ''}
                      onDataChange={handleDataChange}
                      editingField={editingField}
                      setEditingField={setEditingField}
                      isMissing={extractionAttempted && (!data[rent] || !data[rent]['Design and Appeal'])}
                      isEditable={isEditable}
                      manualValidations={manualValidations}
                      revisionHandlers={revisionHandlers}
                      handleManualValidation={handleManualValidation}
                      allData={allData}
                      saleName={rent}
                    />
                  </td>
                  <td className="border border-gray-400 p-1">
                    <EditableField
                      fieldPath={[rent, 'Design and Appeal Adjustment']}
                      value={(data[rent] && data[rent]['Design and Appeal Adjustment']) || ''}
                      onDataChange={handleDataChange}
                      editingField={editingField}
                      setEditingField={setEditingField}
                      isMissing={extractionAttempted && (!data[rent] || !data[rent]['Design and Appeal Adjustment'])}
                      isEditable={isEditable}
                      manualValidations={manualValidations}
                      revisionHandlers={revisionHandlers}
                      handleManualValidation={handleManualValidation}
                      allData={allData}
                      saleName={rent}
                    />
                  </td>
                </React.Fragment>
              ))}
            </tr>

            {/* Age/Condition */}
            <tr>
              <td className="border border-gray-400 p-2 font-medium bg-light">Age/Condition</td>
              <td className="border border-gray-400 p-1">
                <div>
                  <EditableField
                    fieldPath={['Subject', 'Age']}
                    value={subjectData['Age'] || ''}
                    onDataChange={handleDataChange}
                    editingField={editingField}
                    setEditingField={setEditingField}
                    isMissing={extractionAttempted && !subjectData['Age']}
                    isEditable={isEditable}
                    manualValidations={manualValidations}
                    revisionHandlers={revisionHandlers}
                    handleManualValidation={handleManualValidation}
                    allData={allData}
                    saleName={'Subject'}
                  />
                </div>
                <div style={{ borderTop: '1px solid #dee2e6', marginTop: '4px', paddingTop: '4px' }}>
                  <EditableField
                    fieldPath={['Subject', 'Condition']}
                    value={subjectData['Condition'] || ''}
                    onDataChange={handleDataChange}
                    editingField={editingField}
                    setEditingField={setEditingField}
                    isMissing={extractionAttempted && !subjectData['Condition']}
                    isEditable={isEditable}
                    manualValidations={manualValidations}
                    revisionHandlers={revisionHandlers}
                    handleManualValidation={handleManualValidation}
                    allData={allData}
                    saleName={'Subject'}
                  />
                </div>
              </td>
              {activeComparableRents.map((rent, idx) => (
                <React.Fragment key={idx}>
                  <td className="border border-gray-400 p-1">
                    <div>
                      <EditableField
                        fieldPath={[rent, 'Age']}
                        value={(data[rent] && data[rent]['Age']) || ''}
                        onDataChange={handleDataChange}
                        editingField={editingField}
                        setEditingField={setEditingField}
                        isMissing={extractionAttempted && (!data[rent] || !data[rent]['Age'])}
                        isEditable={isEditable}
                        manualValidations={manualValidations}
                        revisionHandlers={revisionHandlers}
                        handleManualValidation={handleManualValidation}
                        allData={allData}
                        saleName={rent}
                      />
                    </div>
                    <div style={{ borderTop: '1px solid #dee2e6', marginTop: '4px', paddingTop: '4px' }}>
                      <EditableField
                        fieldPath={[rent, 'Condition']}
                        value={(data[rent] && data[rent]['Condition']) || ''}
                        onDataChange={handleDataChange}
                        editingField={editingField}
                        setEditingField={setEditingField}
                        isMissing={extractionAttempted && (!data[rent] || !data[rent]['Condition'])}
                        isEditable={isEditable}
                        manualValidations={manualValidations}
                        revisionHandlers={revisionHandlers}
                        handleManualValidation={handleManualValidation}
                        allData={allData}
                        saleName={rent}
                      />
                    </div>
                  </td>
                  <td className="border border-gray-400 p-1">
                    <div>
                      <EditableField
                        fieldPath={[rent, 'Age Adjustment']}
                        value={(data[rent] && data[rent]['Age Adjustment']) || ''}
                        onDataChange={handleDataChange}
                        editingField={editingField}
                        setEditingField={setEditingField}
                        isMissing={extractionAttempted && (!data[rent] || !data[rent]['Age Adjustment'])}
                        isEditable={isEditable}
                        manualValidations={manualValidations}
                        revisionHandlers={revisionHandlers}
                        handleManualValidation={handleManualValidation}
                        allData={allData}
                        saleName={rent}
                      />
                    </div>
                    <div style={{ borderTop: '1px solid #dee2e6', marginTop: '4px', paddingTop: '4px' }}>
                      <EditableField
                        fieldPath={[rent, 'Condition Adjustment']}
                        value={(data[rent] && data[rent]['Condition Adjustment']) || ''}
                        onDataChange={handleDataChange}
                        editingField={editingField}
                        setEditingField={setEditingField}
                        isMissing={extractionAttempted && (!data[rent] || !data[rent]['Condition Adjustment'])}
                        isEditable={isEditable}
                        manualValidations={manualValidations}
                        revisionHandlers={revisionHandlers}
                        handleManualValidation={handleManualValidation}
                        allData={allData}
                        saleName={rent}
                      />
                    </div>
                  </td>
                </React.Fragment>
              ))}
            </tr>

            {/* Above Grade Room Count */}
            <tr>
              <td className="border border-gray-400 p-2 font-medium bg-light">
                <div>Above Grade Room Count</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: '#6c757d', borderTop: '1px solid #dee2e6', marginTop: '4px', paddingTop: '4px' }}>
                  <span>Total</span>
                  <span>Bdrms</span>
                  <span>Baths</span>
                </div>
              </td>
              <td className="border border-gray-400 p-1">
                <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                  <EditableField
                    fieldPath={['Subject', 'Room Count Total']}
                    value={subjectData['Room Count Total'] || ''}
                    onDataChange={handleDataChange}
                    editingField={editingField}
                    setEditingField={setEditingField}
                    isMissing={extractionAttempted && !subjectData['Room Count Total']}
                    isEditable={isEditable}
                    manualValidations={manualValidations}
                    revisionHandlers={revisionHandlers}
                    handleManualValidation={handleManualValidation}
                    allData={allData}
                    saleName={'Subject'}
                  />
                  <span>:</span>
                  <EditableField
                    fieldPath={['Subject', 'Room Count Bdrms']}
                    value={subjectData['Room Count Bdrms'] || ''}
                    onDataChange={handleDataChange}
                    editingField={editingField}
                    setEditingField={setEditingField}
                    isMissing={extractionAttempted && !subjectData['Room Count Bdrms']}
                    isEditable={isEditable}
                    manualValidations={manualValidations}
                    revisionHandlers={revisionHandlers}
                    handleManualValidation={handleManualValidation}
                    allData={allData}
                    saleName={'Subject'}
                  />
                  <span>:</span>
                  <EditableField
                    fieldPath={['Subject', 'Room Count Baths']}
                    value={subjectData['Room Count Baths'] || ''}
                    onDataChange={handleDataChange}
                    editingField={editingField}
                    setEditingField={setEditingField}
                    isMissing={extractionAttempted && !subjectData['Room Count Baths']}
                    isEditable={isEditable}
                    manualValidations={manualValidations}
                    revisionHandlers={revisionHandlers}
                    handleManualValidation={handleManualValidation}
                    allData={allData}
                    saleName={'Subject'}
                  />
                </div>
              </td>
              {activeComparableRents.map((rent, idx) => (
                <React.Fragment key={idx}>
                  <td className="border border-gray-400 p-1">
                    <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                      <EditableField
                        fieldPath={[rent, 'Room Count Total']}
                        value={(data[rent] && data[rent]['Room Count Total']) || ''}
                        onDataChange={handleDataChange}
                        editingField={editingField}
                        setEditingField={setEditingField}
                        isMissing={extractionAttempted && (!data[rent] || !data[rent]['Room Count Total'])}
                        isEditable={isEditable}
                        manualValidations={manualValidations}
                        revisionHandlers={revisionHandlers}
                        handleManualValidation={handleManualValidation}
                        allData={allData}
                        saleName={rent}
                      />
                      <span>:</span>
                      <EditableField
                        fieldPath={[rent, 'Room Count Bdrms']}
                        value={(data[rent] && data[rent]['Room Count Bdrms']) || ''}
                        onDataChange={handleDataChange}
                        editingField={editingField}
                        setEditingField={setEditingField}
                        isMissing={extractionAttempted && (!data[rent] || !data[rent]['Room Count Bdrms'])}
                        isEditable={isEditable}
                        manualValidations={manualValidations}
                        revisionHandlers={revisionHandlers}
                        handleManualValidation={handleManualValidation}
                        allData={allData}
                        saleName={rent}
                      />
                      <span>:</span>
                      <EditableField
                        fieldPath={[rent, 'Room Count Baths']}
                        value={(data[rent] && data[rent]['Room Count Baths']) || ''}
                        onDataChange={handleDataChange}
                        editingField={editingField}
                        setEditingField={setEditingField}
                        isMissing={extractionAttempted && (!data[rent] || !data[rent]['Room Count Baths'])}
                        isEditable={isEditable}
                        manualValidations={manualValidations}
                        revisionHandlers={revisionHandlers}
                        handleManualValidation={handleManualValidation}
                        allData={allData}
                        saleName={rent}
                      />
                    </div>
                  </td>
                  <td className="border border-gray-400 p-1">
                    <EditableField
                      fieldPath={[rent, 'Room Count Total Adjustment']}
                      value={(data[rent] && data[rent]['Room Count Total Adjustment']) || ''}
                      onDataChange={handleDataChange}
                      editingField={editingField}
                      setEditingField={setEditingField}
                      isMissing={extractionAttempted && (!data[rent] || !data[rent]['Room Count Total Adjustment'])}
                      isEditable={isEditable}
                      manualValidations={manualValidations}
                      revisionHandlers={revisionHandlers}
                      handleManualValidation={handleManualValidation}
                      allData={allData}
                      saleName={rent}
                    />
                  </td>
                </React.Fragment>
              ))}
            </tr>

            {/* Gross Living Area */}
            <tr>
              <td className="border border-gray-400 p-2 font-medium bg-light">Gross Living Area</td>
              <td className="border border-gray-400 p-1">
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <EditableField
                    fieldPath={['Subject', 'Gross Living Area']}
                    value={subjectData['Gross Living Area'] || ''}
                    onDataChange={handleDataChange}
                    editingField={editingField}
                    setEditingField={setEditingField}
                    isMissing={extractionAttempted && !subjectData['Gross Living Area']}
                    isEditable={isEditable}
                    manualValidations={manualValidations}
                    revisionHandlers={revisionHandlers}
                    handleManualValidation={handleManualValidation}
                    allData={allData}
                    saleName={'Subject'}
                  />
                  <span style={{ fontSize: '0.75rem' }}>Sq. Ft.</span>
                </div>
              </td>
              {activeComparableRents.map((rent, idx) => (
                <React.Fragment key={idx}>
                  <td className="border border-gray-400 p-1">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <EditableField
                        fieldPath={[rent, 'Gross Living Area']}
                        value={(data[rent] && data[rent]['Gross Living Area']) || ''}
                        onDataChange={handleDataChange}
                        editingField={editingField}
                        setEditingField={setEditingField}
                        isMissing={extractionAttempted && (!data[rent] || !data[rent]['Gross Living Area'])}
                        isEditable={isEditable}
                        manualValidations={manualValidations}
                        revisionHandlers={revisionHandlers}
                        handleManualValidation={handleManualValidation}
                        allData={allData}
                        saleName={rent}
                      />
                      <span style={{ fontSize: '0.75rem' }}>Sq. Ft.</span>
                    </div>
                  </td>
                  <td className="border border-gray-400 p-1">
                    <EditableField
                      fieldPath={[rent, 'Gross Living Area Adjustment']}
                      value={(data[rent] && data[rent]['Gross Living Area Adjustment']) || ''}
                      onDataChange={handleDataChange}
                      editingField={editingField}
                      setEditingField={setEditingField}
                      isMissing={extractionAttempted && (!data[rent] || !data[rent]['Gross Living Area Adjustment'])}
                      isEditable={isEditable}
                      manualValidations={manualValidations}
                      revisionHandlers={revisionHandlers}
                      handleManualValidation={handleManualValidation}
                      allData={allData}
                      saleName={rent}
                    />
                  </td>
                </React.Fragment>
              ))}
            </tr>

            {/* Other (e.g., basement, etc.) */}
            <tr>
              <td className="border border-gray-400 p-2 font-medium bg-light">Other (e.g., basement, etc.)</td>
              <td className="border border-gray-400 p-1">
                <EditableField
                  fieldPath={['Subject', 'Other (e.g., basement, etc.)']}
                  value={subjectData['Other (e.g., basement, etc.)'] || ''}
                  onDataChange={handleDataChange}
                  editingField={editingField}
                  setEditingField={setEditingField}
                  isMissing={extractionAttempted && !subjectData['Other (e.g., basement, etc.)']}
                  isEditable={isEditable}
                  manualValidations={manualValidations}
                  revisionHandlers={revisionHandlers}
                  handleManualValidation={handleManualValidation}
                  allData={allData}
                  saleName={'Subject'}
                />
              </td>
              {activeComparableRents.map((rent, idx) => (
                <React.Fragment key={idx}>
                  <td className="border border-gray-400 p-1">
                    <EditableField
                      fieldPath={[rent, 'Other (e.g., basement, etc.)']}
                      value={(data[rent] && data[rent]['Other (e.g., basement, etc.)']) || ''}
                      onDataChange={handleDataChange}
                      editingField={editingField}
                      setEditingField={setEditingField}
                      isMissing={extractionAttempted && (!data[rent] || !data[rent]['Other (e.g., basement, etc.)'])}
                      isEditable={isEditable}
                      manualValidations={manualValidations}
                      revisionHandlers={revisionHandlers}
                      handleManualValidation={handleManualValidation}
                      allData={allData}
                      saleName={rent}
                    />
                  </td>
                  <td className="border border-gray-400 p-1">
                    <EditableField
                      fieldPath={[rent, 'Other (e.g., basement, etc.) Adjustment']}
                      value={(data[rent] && data[rent]['Other (e.g., basement, etc.) Adjustment']) || ''}
                      onDataChange={handleDataChange}
                      editingField={editingField}
                      setEditingField={setEditingField}
                      isMissing={extractionAttempted && (!data[rent] || !data[rent]['Other (e.g., basement, etc.) Adjustment'])}
                      isEditable={isEditable}
                      manualValidations={manualValidations}
                      revisionHandlers={revisionHandlers}
                      handleManualValidation={handleManualValidation}
                      allData={allData}
                      saleName={rent}
                    />
                  </td>
                </React.Fragment>
              ))}
            </tr>

            {/* Other: */}
            <tr>
              <td className="border border-gray-400 p-2 font-medium bg-light">Other:</td>
              <td className="border border-gray-400 p-1">
                <EditableField
                  fieldPath={['Subject', 'Other:']}
                  value={subjectData['Other:'] || ''}
                  onDataChange={handleDataChange}
                  editingField={editingField}
                  setEditingField={setEditingField}
                  isMissing={extractionAttempted && !subjectData['Other:']}
                  isEditable={isEditable}
                  manualValidations={manualValidations}
                  revisionHandlers={revisionHandlers}
                  handleManualValidation={handleManualValidation}
                  allData={allData}
                  saleName={'Subject'}
                />
              </td>
              {activeComparableRents.map((rent, idx) => (
                <React.Fragment key={idx}>
                  <td className="border border-gray-400 p-1">
                    <EditableField
                      fieldPath={[rent, 'Other:']}
                      value={(data[rent] && data[rent]['Other:']) || ''}
                      onDataChange={handleDataChange}
                      editingField={editingField}
                      setEditingField={setEditingField}
                      isMissing={extractionAttempted && (!data[rent] || !data[rent]['Other:'])}
                      isEditable={isEditable}
                      manualValidations={manualValidations}
                      revisionHandlers={revisionHandlers}
                      handleManualValidation={handleManualValidation}
                      allData={allData}
                      saleName={rent}
                    />
                  </td>
                  <td className="border border-gray-400 p-1 bg-gray-200" style={{ backgroundColor: '#e9ecef' }}></td>
                </React.Fragment>
              ))}
            </tr>

            {/* Net Adj. (total) */}
            <tr>
              <td className="border border-gray-400 p-2 font-medium bg-light">Net Adj. (total)</td>
              <td className="border border-gray-400 p-1 bg-gray-200" style={{ backgroundColor: '#e9ecef' }}></td>
              {activeComparableRents.map((rent, idx) => {
                const rawNetVal = String((data[rent] && data[rent]['Net Adj. (total)']) || '').trim();
                const isPlus = rawNetVal.startsWith('+') || parseFloat(rawNetVal) > 0;
                const isMinus = rawNetVal.startsWith('-') || parseFloat(rawNetVal) < 0;
                const cleanNetVal = stripDollar(rawNetVal.replace(/[+-]/g, '').trim());

                return (
                  <React.Fragment key={idx}>
                    <td className="border border-gray-400 p-1 bg-gray-200" style={{ backgroundColor: '#e9ecef' }}></td>
                    <td className="border border-gray-400 p-1">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <span style={{ fontSize: '0.7rem', display: 'flex', alignItems: 'center', gap: '2px' }}>
                          <input type="checkbox" checked={isPlus} readOnly disabled style={{ transform: 'scale(0.8)', margin: 0 }} />+
                          <input type="checkbox" checked={isMinus} readOnly disabled style={{ transform: 'scale(0.8)', margin: 0 }} />-
                        </span>
                        <span>$</span>
                        <EditableField
                          fieldPath={[rent, 'Net Adj. (total)']}
                          value={cleanNetVal}
                          onDataChange={handleDataChange}
                          editingField={editingField}
                          setEditingField={setEditingField}
                          isMissing={extractionAttempted && (!data[rent] || !data[rent]['Net Adj. (total)'])}
                          isEditable={isEditable}
                          manualValidations={manualValidations}
                          revisionHandlers={revisionHandlers}
                          handleManualValidation={handleManualValidation}
                          allData={allData}
                          saleName={rent}
                        />
                      </div>
                    </td>
                  </React.Fragment>
                );
              })}
            </tr>

            {/* Indicated Monthly Market Rent */}
            <tr>
              <td className="border border-gray-400 p-2 font-medium bg-light">Indicated Monthly Market Rent</td>
              <td className="border border-gray-400 p-1 bg-gray-200" style={{ backgroundColor: '#e9ecef' }}></td>
              {activeComparableRents.map((rent, idx) => (
                <React.Fragment key={idx}>
                  <td className="border border-gray-400 p-1 bg-gray-200" style={{ backgroundColor: '#e9ecef' }}></td>
                  <td className="border border-gray-400 p-1">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span>$</span>
                      <EditableField
                        fieldPath={[rent, 'Indicated Monthly Market Rent']}
                        value={stripDollar(data[rent] && data[rent]['Indicated Monthly Market Rent'])}
                        onDataChange={handleDataChange}
                        editingField={editingField}
                        setEditingField={setEditingField}
                        isMissing={extractionAttempted && (!data[rent] || !data[rent]['Indicated Monthly Market Rent'])}
                        isEditable={isEditable}
                        manualValidations={manualValidations}
                        revisionHandlers={revisionHandlers}
                        handleManualValidation={handleManualValidation}
                        allData={allData}
                        saleName={rent}
                      />
                    </div>
                  </td>
                </React.Fragment>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ComparableRentScheduleTable;
