import React, { useState } from 'react';
import { EditableField } from './FormComponents';
import {
  Tooltip,
  IconButton,
  Button,
  Chip,
  Paper,
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Dialog,
  DialogTitle,
  DialogContent,
  Stack,
  CircularProgress
} from '@mui/material';
import LibraryBooksIcon from '@mui/icons-material/LibraryBooks';
import PinDropIcon from '@mui/icons-material/PinDrop';
import MapIcon from '@mui/icons-material/Map';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import CancelIcon from '@mui/icons-material/Cancel';
import CloseIcon from '@mui/icons-material/Close';


const SalesComparisonSection = ({
  id = "sales-comparison",
  data,
  extractionAttempted,
  handleDataChange,
  editingField,
  setEditingField,
  salesGridRows,
  comparableSales,
  salesHistoryFields,
  salesComparisonAdditionalInfoFields,
  formType,
  isEditable,
  allData,
  manualValidations,
  handleManualValidation,
  onRevisionButtonClick,
  revisionHandlers,
  onVerifyMapAddresses,
  mapVerificationData,
  mapVerificationLoading = false
}) => {
  extractionAttempted = false;
  const [mapModalOpen, setMapModalOpen] = useState(false);
  const [previewMapImg, setPreviewMapImg] = useState(null);

  // Extract map verification payload from props or root data
  const mapVerif = mapVerificationData
    || data?.MAP_VERIFICATION
    || data?.map_verification
    || allData?.MAP_VERIFICATION
    || allData?.map_verification
    || null;

  const vData = mapVerif?.verification_data || mapVerif || {};
  const subjVerif = vData?.subject_verification || null;
  const rawCompsVerif = vData?.comparables_verification || [];
  const compsVerif = [];
  const seenCompKeys = new Set();
  rawCompsVerif.forEach(c => {
    const key = String(c.comp_num || c.comp_id || '').trim();
    if (key && !seenCompKeys.has(key)) {
      seenCompKeys.add(key);
      compsVerif.push(c);
    } else if (!key) {
      compsVerif.push(c);
    }
  });
  const mapsDetected = vData?.maps_detected || [];
  const overallStatus = String(mapVerif?.overall_status || vData?.overall_status || '').toUpperCase();

  const handleOpenMapModal = () => {
    setMapModalOpen(true);
    if (!mapVerif && onVerifyMapAddresses) {
      onVerifyMapAddresses();
    }
  };

  const getCompData = (sale) => {
    if (!data || typeof data !== 'object') return {};
    if (data[sale] && typeof data[sale] === 'object') return data[sale];
    if (data.SALES_GRID && data.SALES_GRID[sale] && typeof data.SALES_GRID[sale] === 'object') return data.SALES_GRID[sale];
    const noSpace = typeof sale === 'string' ? sale.replace('# ', '#') : sale;
    const withSpace = typeof sale === 'string' ? sale.replace('#', '# ') : sale;
    if (data[noSpace] && typeof data[noSpace] === 'object') return data[noSpace];
    if (data[withSpace] && typeof data[withSpace] === 'object') return data[withSpace];
    if (data.SALES_GRID && data.SALES_GRID[noSpace] && typeof data.SALES_GRID[noSpace] === 'object') return data.SALES_GRID[noSpace];
    if (data.SALES_GRID && data.SALES_GRID[withSpace] && typeof data.SALES_GRID[withSpace] === 'object') return data.SALES_GRID[withSpace];
    return {};
  };

  const getSubjectData = () => {
    if (!data || typeof data !== 'object') return {};
    const s1 = (typeof data.Subject === 'object' && data.Subject) || {};
    const s2 = (typeof data.SUBJECT === 'object' && data.SUBJECT) || {};
    const s3 = (data.SALES_GRID && typeof data.SALES_GRID.Subject === 'object' && data.SALES_GRID.Subject) || {};
    return { ...s2, ...s1, ...s3 };
  };

  const subjectObj = getSubjectData();

  const getStatusBadge = (status) => {
    const s = String(status || '').trim().toLowerCase();
    if (['fulfilled', 'ok', 'pass', 'passed', 'yes', 'match'].includes(s)) {
      return (
        <Chip
          size="small"
          icon={<CheckCircleIcon sx={{ fontSize: 14 }} />}
          label="MATCH"
          sx={{ bgcolor: '#e8f5e9', color: '#2e7d32', fontWeight: 600, height: 22, fontSize: '0.75rem' }}
        />
      );
    }
    if (['mismatch', 'failed', 'not fulfilled', 'fail'].includes(s)) {
      return (
        <Chip
          size="small"
          icon={<CancelIcon sx={{ fontSize: 14 }} />}
          label="MISMATCH"
          sx={{ bgcolor: '#ffebee', color: '#c62828', fontWeight: 600, height: 22, fontSize: '0.75rem' }}
        />
      );
    }
    if (['partial_match', 'needs review', 'review', 'warning'].includes(s)) {
      return (
        <Chip
          size="small"
          icon={<WarningAmberIcon sx={{ fontSize: 14 }} />}
          label="REVIEW"
          sx={{ bgcolor: '#fff8e1', color: '#f57f17', fontWeight: 600, height: 22, fontSize: '0.75rem' }}
        />
      );
    }
    return (
      <Chip
        size="small"
        label={status || 'NOT DETECTED'}
        sx={{ bgcolor: '#f5f5f5', color: '#757575', fontWeight: 500, height: 22, fontSize: '0.75rem' }}
      />
    );
  };

  return (
    <>
      <Paper id={id} elevation={3} sx={{ mb: 4, mt: 4, borderRadius: 2, overflow: 'hidden' }}>
        <Box sx={{ bgcolor: 'primary.main', color: 'white', px: 2, py: 1.5, display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, zIndex: 10, flexWrap: 'wrap', gap: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="subtitle1" fontWeight="bold">Sales Comparison Approach</Typography>
            {overallStatus && (
              <Chip
                size="small"
                label={`Maps: ${overallStatus}`}
                sx={{
                  bgcolor: overallStatus === 'PASS' ? '#2e7d32' : (overallStatus === 'FAIL' ? '#c62828' : '#f57f17'),
                  color: 'white',
                  fontWeight: 'bold',
                  height: 22,
                  fontSize: '0.72rem'
                }}
              />
            )}
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, ml: 'auto' }}>
            <Tooltip title="Verify Subject & Comp Addresses against Location & Aerial Map callouts">
              <Button
                size="small"
                variant="contained"
                onClick={handleOpenMapModal}
                disabled={mapVerificationLoading}
                startIcon={mapVerificationLoading ? <CircularProgress size={14} color="inherit" /> : <PinDropIcon sx={{ fontSize: 16 }} />}
                sx={{
                  bgcolor: 'rgba(255, 255, 255, 0.18)',
                  color: 'white',
                  '&:hover': { bgcolor: 'rgba(255, 255, 255, 0.3)' },
                  textTransform: 'none',
                  fontWeight: 600,
                  fontSize: '0.8rem',
                  py: 0.4,
                  px: 1.2,
                  borderRadius: 1.5
                }}
              >
                {mapVerificationLoading ? 'Verifying Maps...' : 'Verify Map Addresses'}
              </Button>
            </Tooltip>
            {onRevisionButtonClick && (
              <Tooltip title="Revision Language">
                <IconButton onClick={onRevisionButtonClick} size="small" sx={{ color: 'white' }}><LibraryBooksIcon /></IconButton>
              </Tooltip>
            )}
          </Box>
        </Box>
        <TableContainer>
          <Table size="small" aria-label="sales comparison table" className="sales-comparison-table">
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 'bold', minWidth: '200px', backgroundColor: 'action.hover' }}>Feature</TableCell>
                <TableCell sx={{ fontWeight: 'bold', minWidth: '200px', backgroundColor: 'action.hover' }}>Subject</TableCell>
                {comparableSales.map((sale, idx) => (
                  <TableCell key={idx} sx={{ fontWeight: 'bold', minWidth: '200px', backgroundColor: 'action.hover' }}>{sale}</TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {salesGridRows.map((row, idx) => {
                const isHighlighted = row.label === 'Date of Sale/Time';
                const isFirstAdjustment = row.valueKey === "Sales or Financing Concessions" || row.valueKey === "Sales Concessions";
                const isFirstUnitBreakdown = row.isUnitBreakdown && row.unitNumber === 1;

                const renderRow = () => {
                  if (row.isUnitBreakdown) {
                    const u = row.unitNumber;
                    const totKey = `Unit Breakdown Tot Unit # ${u}`;
                    const brKey = `Unit Breakdown Br Unit # ${u}`;
                    const baKey = `Unit Breakdown Ba Unit # ${u}`;
                    const adjKey = `Unit Breakdown Adjustment Unit # ${u}`;

                    return (
                      <TableRow key={idx} hover>
                        <TableCell sx={{ fontWeight: 'medium', borderRight: '1px solid rgba(224, 224, 224, 1)', pl: 3 }}>
                          Unit #{u}
                        </TableCell>

                        <TableCell sx={{ borderRight: '1px solid rgba(224, 224, 224, 1)' }}>
                          <div style={{ display: 'flex', gap: '4px' }}>
                            <EditableField fieldPath={['Subject', totKey]} value={subjectObj[totKey] || ''} onDataChange={handleDataChange} editingField={editingField} setEditingField={setEditingField} isEditable={true} allData={allData || data} revisionHandlers={revisionHandlers} placeholder="Tot" />
                            <EditableField fieldPath={['Subject', brKey]} value={subjectObj[brKey] || ''} onDataChange={handleDataChange} editingField={editingField} setEditingField={setEditingField} isEditable={true} allData={allData || data} revisionHandlers={revisionHandlers} placeholder="Br" />
                            <EditableField fieldPath={['Subject', baKey]} value={subjectObj[baKey] || ''} onDataChange={handleDataChange} editingField={editingField} setEditingField={setEditingField} isEditable={true} allData={allData || data} revisionHandlers={revisionHandlers} placeholder="Ba" />
                          </div>
                        </TableCell>

                        {comparableSales.map((sale, cidx) => {
                          const compVal = getCompData(sale);
                          return (
                            <TableCell key={cidx} sx={{ borderRight: '1px solid rgba(224, 224, 224, 1)' }}>
                              <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                                <EditableField fieldPath={[sale, totKey]} value={compVal[totKey] || ''} onDataChange={handleDataChange} editingField={editingField} setEditingField={setEditingField} isEditable={true} allData={allData || data} revisionHandlers={revisionHandlers} placeholder="Tot" />
                                <EditableField fieldPath={[sale, brKey]} value={compVal[brKey] || ''} onDataChange={handleDataChange} editingField={editingField} setEditingField={setEditingField} isEditable={true} allData={allData || data} revisionHandlers={revisionHandlers} placeholder="Br" />
                                <EditableField fieldPath={[sale, baKey]} value={compVal[baKey] || ''} onDataChange={handleDataChange} editingField={editingField} setEditingField={setEditingField} isEditable={true} allData={allData || data} revisionHandlers={revisionHandlers} placeholder="Ba" />
                                <EditableField fieldPath={[sale, adjKey]} value={compVal[adjKey] || ''} onDataChange={handleDataChange} editingField={editingField} setEditingField={setEditingField} isEditable={true} isAdjustment={true} allData={allData || data} revisionHandlers={revisionHandlers} placeholder="Adj" />
                              </div>
                            </TableCell>
                          );
                        })}
                      </TableRow>
                    );
                  }

                  let mostCommonLeasehold = null;
                  let leaseholdInconsistent = false;
                  if (row.label === "Leasehold/Fee Simple") {
                    const allValues = [subjectObj[row.valueKey], ...comparableSales.map(sale => getCompData(sale)[row.valueKey])].filter(Boolean);
                    if (allValues.length > 0) {
                      const valueCounts = allValues.reduce((acc, value) => {
                        acc[value] = (acc[value] || 0) + 1;
                        return acc;
                      }, {});
                      mostCommonLeasehold = Object.keys(valueCounts).reduce((a, b) => valueCounts[a] > valueCounts[b] ? a : b);
                      const uniqueValues = new Set(allValues);
                      if (uniqueValues.size > 1) leaseholdInconsistent = true;
                    }
                  }

                  const subjectValue = row.label === "Verification Source(s)"
                    ? (comparableSales.map(sale => getCompData(sale)[row.valueKey]).find(Boolean) || subjectObj[row.valueKey] || '')
                    : (row.subjectValueKey ? (data[row.subjectValueKey] || subjectObj[row.subjectValueKey] || subjectObj[row.valueKey] || '') : (subjectObj[row.valueKey] || data[row.valueKey] || ''));

                  const subjectStyle = {};
                  if (extractionAttempted && !subjectValue) {
                    subjectStyle.border = '2px solid red';
                  }
                  const subjectLeaseholdValue = subjectObj[row.valueKey] || '';
                  if (leaseholdInconsistent && subjectLeaseholdValue && subjectLeaseholdValue !== mostCommonLeasehold) {
                    subjectStyle.backgroundColor = 'red';
                  }

                  return (
                    <TableRow key={idx} sx={isHighlighted ? { backgroundColor: 'action.selected' } : {}}>
                      <TableCell sx={{ fontWeight: 'medium', borderRight: '1px solid rgba(224, 224, 224, 1)' }}>{row.label}</TableCell>
                      <TableCell sx={{ borderRight: '1px solid rgba(224, 224, 224, 1)', ...subjectStyle }}>
                        {!row.isAdjustmentOnly && (
                          <EditableField
                            fieldPath={row.subjectValueKey ? [row.subjectValueKey] : ['Subject', row.valueKey]}
                            value={subjectValue}
                            onDataChange={handleDataChange} editingField={editingField} setEditingField={setEditingField}
                            isMissing={extractionAttempted && !subjectValue}
                            isEditable={true}
                            allData={allData || data}
                            saleName={'Subject'}
                            manualValidations={manualValidations}
                            handleManualValidation={handleManualValidation}
                            revisionHandlers={revisionHandlers}
                          />
                        )}
                        {row.adjustmentKey && (
                          <EditableField
                            fieldPath={['Subject', row.adjustmentKey]} value={subjectObj[row.adjustmentKey] || ''}
                            onDataChange={handleDataChange} editingField={editingField} setEditingField={setEditingField}
                            isMissing={extractionAttempted && (!subjectObj[row.adjustmentKey] || subjectObj[row.adjustmentKey] === '')}
                            isEditable={true} isAdjustment={true}
                            allData={allData || data}
                            saleName={'Subject'}
                            manualValidations={manualValidations}
                            handleManualValidation={handleManualValidation}
                            revisionHandlers={revisionHandlers}
                          />
                        )}
                      </TableCell>
                      {comparableSales.map((sale, cidx) => {
                        const compObj = getCompData(sale);
                        const compValue = compObj[row.valueKey] ?? compObj[row.valueKey?.replace('of Comparable', 'of Comparables')] ?? compObj[row.valueKey?.replace('of Comparables', 'of Comparable')] ?? '';
                        const rawAdjValue = compObj[row.adjustmentKey];
                        const adjValue = (row.adjustmentKey === 'Baths Adjustment' && (rawAdjValue === undefined || rawAdjValue === ''))
                          ? (compObj['Above Grade Room Count Adjustment'] || '')
                          : (rawAdjValue || '');
                        const cellStyle = {};
                        if (extractionAttempted && !row.isAdjustmentOnly && (!compObj || (compValue === undefined || compValue === ''))) {
                          cellStyle.border = '2px solid red';
                        }

                        return (
                          <TableCell key={cidx} sx={{ borderRight: '1px solid rgba(224, 224, 224, 1)', ...cellStyle }}>
                            {!row.isAdjustmentOnly && (
                              <EditableField
                                fieldPath={[sale, row.valueKey]}
                                value={compValue}
                                onDataChange={handleDataChange} editingField={editingField} setEditingField={setEditingField}
                                isMissing={extractionAttempted && (!compValue || compValue === '')}
                                isEditable={true}
                                allData={allData || data}
                                saleName={sale}
                                manualValidations={manualValidations}
                                handleManualValidation={handleManualValidation}
                                revisionHandlers={revisionHandlers}
                              />
                            )}
                            {row.adjustmentKey && (
                              <EditableField
                                fieldPath={[sale, row.adjustmentKey]}
                                value={adjValue}
                                onDataChange={handleDataChange} editingField={editingField} setEditingField={setEditingField}
                                isMissing={extractionAttempted && (!adjValue || adjValue === '')}
                                isEditable={true}
                                isAdjustment={true}
                                allData={allData || data}
                                saleName={sale}
                                manualValidations={manualValidations}
                                handleManualValidation={handleManualValidation}
                                revisionHandlers={revisionHandlers}
                              />
                            )}
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  );
                };

                return (
                  <React.Fragment key={idx}>
                    {isFirstAdjustment && (
                      <TableRow key={`adj-header-${idx}`} sx={{ backgroundColor: '#f3f4f6' }}>
                        <TableCell sx={{ fontWeight: 'bold', borderRight: '1px solid rgba(224, 224, 224, 1)' }}>VALUE ADJUSTMENTS</TableCell>
                        <TableCell sx={{ fontWeight: 'bold', borderRight: '1px solid rgba(224, 224, 224, 1)', textAlign: 'center' }}>DESCRIPTION</TableCell>
                        {comparableSales.map((sale, cidx) => (
                          <TableCell key={cidx} sx={{ fontWeight: 'bold', borderRight: '1px solid rgba(224, 224, 224, 1)', textAlign: 'center' }}>DESCRIPTION / ADJ</TableCell>
                        ))}
                      </TableRow>
                    )}
                    {isFirstUnitBreakdown && (
                      <TableRow key={`unit-header-${idx}`} sx={{ backgroundColor: '#f3f4f6' }}>
                        <TableCell sx={{ fontWeight: 'bold', borderRight: '1px solid rgba(224, 224, 224, 1)' }}>Unit Breakdown</TableCell>
                        <TableCell sx={{ fontWeight: 'bold', borderRight: '1px solid rgba(224, 224, 224, 1)', textAlign: 'center' }}>Total / Br / Ba</TableCell>
                        {comparableSales.map((sale, cidx) => (
                          <TableCell key={cidx} sx={{ fontWeight: 'bold', borderRight: '1px solid rgba(224, 224, 224, 1)', textAlign: 'center' }}>Total / Br / Ba / Adj</TableCell>
                        ))}
                      </TableRow>
                    )}
                    {renderRow()}
                  </React.Fragment>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {formType !== 'Appraisal Version #1' && (
        <Paper elevation={3} sx={{ mb: 4, borderRadius: 2, overflow: 'hidden' }}>
          <Box sx={{ bgcolor: 'info.main', color: 'white', px: 2, py: 1.5, position: 'sticky', top: 0, zIndex: 10 }}>
            <Typography variant="subtitle1" fontWeight="bold">Sales or Transfer History</Typography>
          </Box>
          <TableContainer>
            <Table size="small">
              <TableBody>
                {salesComparisonAdditionalInfoFields.map((field, index) => (
                  <TableRow key={index} hover>
                    <TableCell sx={{ width: '50%' }}>{field}</TableCell>
                    <TableCell>
                      <EditableField
                        fieldPath={[field]}
                        value={data[field] || ''}
                        onDataChange={(path, val) => handleDataChange(path, val)} editingField={editingField} setEditingField={setEditingField}
                        isMissing={extractionAttempted && (!data[field] || data[field] === '')}
                        allData={allData}
                        isEditable={true}
                        manualValidations={manualValidations}
                        handleManualValidation={handleManualValidation}
                        revisionHandlers={revisionHandlers}
                        showBlankValidation={field === 'Indicated Value by Sales Comparison Approach' ? false : undefined}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      )}

      {formType !== 'Appraisal Version #1' && (
        <Paper id="prior-sale-history-grid" elevation={3} sx={{ mb: 4, mt: 4, borderRadius: 2, overflow: 'hidden' }}>
          <Box sx={{ bgcolor: 'grey.900', color: 'white', px: 2, py: 1.5, position: 'sticky', top: 0, zIndex: 10 }}>
          </Box>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 'bold', backgroundColor: 'action.hover' }}>Feature</TableCell>
                  <TableCell sx={{ fontWeight: 'bold', backgroundColor: 'action.hover' }}>Subject</TableCell>
                  {comparableSales.map((sale, idx) => (
                    <TableCell key={idx} sx={{ fontWeight: 'bold', backgroundColor: 'action.hover' }}>{sale}</TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {salesHistoryFields.map((feature, idx) => (
                  <TableRow key={idx} hover>
                    <TableCell sx={{ fontWeight: 'medium' }}>{feature}</TableCell>
                    <TableCell>
                      <EditableField
                        fieldPath={['Subject', feature]}
                        value={data.Subject?.[feature] || ''}
                        onDataChange={handleDataChange} editingField={editingField} setEditingField={setEditingField}
                        isMissing={extractionAttempted && (!data.Subject?.[feature] || data.Subject?.[feature] === '')}
                        allData={allData}
                        isEditable={true}
                        manualValidations={manualValidations}
                        handleManualValidation={handleManualValidation}
                      />
                    </TableCell>
                    {comparableSales.map((sale, cidx) => (
                      <TableCell key={cidx}>
                        <EditableField
                          fieldPath={[sale, feature]}
                          value={data[sale]?.[feature] || ''}
                          onDataChange={handleDataChange} editingField={editingField} setEditingField={setEditingField}
                          isMissing={extractionAttempted && (!data[sale]?.[feature] || data[sale]?.[feature] === '')}
                          allData={allData}
                          isEditable={true}
                          manualValidations={manualValidations}
                          handleManualValidation={handleManualValidation}
                        />
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      )}

      {/* Map Address Verification Dialog */}
      <Dialog
        open={mapModalOpen}
        onClose={() => setMapModalOpen(false)}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle sx={{ bgcolor: 'primary.main', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 1.5 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <PinDropIcon />
            <Typography variant="h6" fontWeight="bold">Map Address & Proximity Verification</Typography>
            {overallStatus && (
              <Chip
                size="small"
                label={overallStatus}
                sx={{
                  bgcolor: overallStatus === 'PASS' ? '#2e7d32' : (overallStatus === 'FAIL' ? '#c62828' : '#f57f17'),
                  color: 'white',
                  fontWeight: 'bold',
                  ml: 1
                }}
              />
            )}
          </Box>
          <IconButton onClick={() => setMapModalOpen(false)} size="small" sx={{ color: 'white' }}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ p: 3 }}>
          {mapVerificationLoading ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', py: 6 }}>
              <CircularProgress size={40} sx={{ mb: 2 }} />
              <Typography variant="body1" fontWeight="medium">
                Analyzing Location Map & Aerial Map exhibits and extracting callout pins...
              </Typography>
            </Box>
          ) : !mapVerif ? (
            <Box sx={{ textAlign: 'center', py: 5 }}>
              <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
                Map address verification has not been run yet.
              </Typography>
              {onVerifyMapAddresses && (
                <Button
                  variant="contained"
                  color="primary"
                  startIcon={<PinDropIcon />}
                  onClick={onVerifyMapAddresses}
                >
                  Run Map Address Verification
                </Button>
              )}
            </Box>
          ) : (
            <Stack spacing={2.5}>
              <Paper elevation={0} sx={{ p: 2, bgcolor: 'action.hover', borderRadius: 2 }}>
                <Typography variant="body2" sx={{ lineHeight: 1.6 }}>
                  {mapVerif.summary || 'Subject and Comparable addresses cross-verified against Location Map and Aerial Map.'}
                </Typography>
              </Paper>

              {/* Side by side comparison table */}
              <TableContainer sx={{ border: '1px solid rgba(224, 224, 224, 0.8)', borderRadius: 2 }}>
                <Table size="small">
                  <TableHead sx={{ bgcolor: 'action.hover' }}>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 'bold', width: '16%' }}>Property</TableCell>
                      <TableCell sx={{ fontWeight: 'bold', width: '28%' }}>Sales Comparison Grid</TableCell>
                      <TableCell sx={{ fontWeight: 'bold', width: '28%' }}>Location Map Callout</TableCell>
                      <TableCell sx={{ fontWeight: 'bold', width: '12%' }}>Status</TableCell>
                      <TableCell sx={{ fontWeight: 'bold', width: '16%' }}>Verification Notes</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {/* Subject Property */}
                    {subjVerif && (
                      <TableRow hover sx={{ bgcolor: subjVerif.status === 'MATCH' ? 'rgba(232, 245, 233, 0.4)' : 'inherit' }}>
                        <TableCell sx={{ fontWeight: 'bold' }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <PinDropIcon fontSize="small" color="primary" />
                            Subject Property
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" fontWeight="medium">
                            {subjVerif.sales_comparison_address || subjectObj?.['Address'] || 'N/A'}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">
                            {subjVerif.location_map_address || (subjVerif.aerial_map_address ? `Aerial: ${subjVerif.aerial_map_address}` : 'Callout not detected')}
                          </Typography>
                        </TableCell>
                        <TableCell>{getStatusBadge(subjVerif.status)}</TableCell>
                        <TableCell>
                          <Typography variant="caption" color="text.secondary">
                            {subjVerif.details}
                          </Typography>
                        </TableCell>
                      </TableRow>
                    )}

                    {/* Comparables */}
                    {compsVerif.map((c, idx) => (
                      <TableRow key={idx} hover sx={{ bgcolor: c.status === 'MATCH' ? 'inherit' : (c.status === 'MISMATCH' ? 'rgba(255, 235, 238, 0.4)' : 'inherit') }}>
                        <TableCell sx={{ fontWeight: 'bold' }}>
                          {c.comp_id || `Comparable #${c.comp_num || idx + 1}`}
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" fontWeight="medium">
                            {c.sales_comparison_address || 'N/A'}
                          </Typography>
                          {c.sales_comparison_proximity && (
                            <Typography variant="caption" color="text.secondary" display="block">
                              Proximity: {c.sales_comparison_proximity}
                            </Typography>
                          )}
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">
                            {c.map_address || 'Pin callout not detected'}
                          </Typography>
                          {c.map_proximity && (
                            <Typography variant="caption" color="text.secondary" display="block">
                              Pin: {c.map_proximity} {c.map_label ? `(${c.map_label})` : ''}
                            </Typography>
                          )}
                        </TableCell>
                        <TableCell>{getStatusBadge(c.status)}</TableCell>
                        <TableCell>
                          <Typography variant="caption" color="text.secondary">
                            {c.details}
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>

              {/* Detected Maps Thumbnails */}
              {mapsDetected.length > 0 && (
                <Box sx={{ mt: 1 }}>
                  <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 1, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <MapIcon fontSize="small" />
                    Detected Map Exhibits ({mapsDetected.length})
                  </Typography>
                  <Stack direction="row" spacing={2} sx={{ overflowX: 'auto', pb: 1 }}>
                    {mapsDetected.map((m, idx) => (
                      <Box
                        key={idx}
                        onClick={() => setPreviewMapImg(m)}
                        sx={{
                          border: '1px solid rgba(0,0,0,0.12)',
                          borderRadius: 2,
                          overflow: 'hidden',
                          cursor: 'pointer',
                          minWidth: 180,
                          maxWidth: 220,
                          transition: 'all 0.2s',
                          '&:hover': { boxShadow: 3 }
                        }}
                      >
                        {m.image_preview && (
                          <img
                            src={m.image_preview}
                            alt={m.map_type}
                            style={{ width: '100%', height: 110, objectFit: 'cover' }}
                          />
                        )}
                        <Box sx={{ p: 1 }}>
                          <Typography variant="caption" fontWeight="bold" display="block">
                            {m.map_type} (P. {m.page})
                          </Typography>
                          <Typography variant="caption" color="text.secondary" display="block">
                            {m.provider}
                          </Typography>
                        </Box>
                      </Box>
                    ))}
                  </Stack>
                </Box>
              )}
            </Stack>
          )}
        </DialogContent>
      </Dialog>

      {/* Map Exhibit Zoom Dialog */}
      <Dialog
        open={Boolean(previewMapImg)}
        onClose={() => setPreviewMapImg(null)}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6">
            {previewMapImg?.map_type} (Page {previewMapImg?.page})
          </Typography>
          <IconButton onClick={() => setPreviewMapImg(null)} size="small">
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ textAlign: 'center', p: 2 }}>
          {previewMapImg?.image_preview && (
            <img
              src={previewMapImg.image_preview}
              alt={previewMapImg.map_type}
              style={{ maxWidth: '100%', maxHeight: '80vh', objectFit: 'contain', borderRadius: 8 }}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default SalesComparisonSection;
