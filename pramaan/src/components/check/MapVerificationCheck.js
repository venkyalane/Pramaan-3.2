import React, { useCallback, useState } from 'react';
import {
  Button,
  CircularProgress,
  Paper,
  Typography,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Stack,
  Chip,
  Box,
  Dialog,
  DialogTitle,
  DialogContent,
  IconButton,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Card,
  CardMedia,
  CardContent,
  Grid
} from '@mui/material';
import {
  Map as MapIcon,
  PinDrop as PinDropIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  WarningAmber as WarningIcon,
  HelpOutline as HelpIcon,
  ZoomIn as ZoomInIcon,
  Close as CloseIcon,
  LocationSearching as LocationSearchingIcon,
  Satellite as SatelliteIcon
} from '@mui/icons-material';

export const MAP_VERIFICATION_PROMPT = `
Verify subject address and comparable addresses from the sales comparison section against location and aerial maps.
Return a structured audit object verifying:
1. Subject Property Address against Location Map and Aerial Map exhibits.
2. Comparable Property Addresses, Distances, and Directions against Location Map and Aerial Map pins.
`;

const MapVerificationCheck = ({
  onPromptSubmit,
  loading = false,
  response = null,
  error = null
}) => {
  const [filterValue, setFilterValue] = useState('all');
  const [previewImage, setPreviewImage] = useState(null);

  const handleCheck = () => {
    if (onPromptSubmit) {
      onPromptSubmit(MAP_VERIFICATION_PROMPT);
    }
  };

  const renderContent = useCallback(() => {
    if (!response) return null;

    let data = response;
    if (typeof response === 'string') {
      try {
        data = JSON.parse(response);
      } catch (e) {
        return <pre style={{ overflowX: 'auto' }}>{response}</pre>;
      }
    }

    const { summary, details, verification_data } = data;
    const vData = verification_data || {};

    // Defensively deduplicate comparables in UI
    const compsVerif = [];
    const seenCompKeys = new Set();
    (vData.comparables_verification || []).forEach(c => {
      const key = String(c.comp_num || c.comp_id || '').trim();
      if (key && !seenCompKeys.has(key)) {
        seenCompKeys.add(key);
        compsVerif.push(c);
      } else if (!key) {
        compsVerif.push(c);
      }
    });

    const subjVerif = vData.subject_verification || null;
    const mapsDetected = vData.maps_detected || [];
    const metrics = vData.summary_metrics || {};

    const overallStatus = String(data.overall_status || vData.overall_status || 'PASS').toUpperCase();

    // Deduplicate and filter requirement details
    const parsedDetails = [];
    const seenReqNames = new Set();
    (Array.isArray(details) ? details : []).forEach(item => {
      const reqName = String(item.requirement || '').trim();
      if (reqName && !seenReqNames.has(reqName)) {
        seenReqNames.add(reqName);
        parsedDetails.push(item);
      } else if (!reqName) {
        parsedDetails.push(item);
      }
    });

    const filteredDetails = parsedDetails.filter(item => {
      const s = String(item.status || '').toLowerCase();
      if (filterValue === 'passed') return ['fulfilled', 'ok', 'pass', 'passed', 'yes'].includes(s);
      if (filterValue === 'failed') return !['fulfilled', 'ok', 'pass', 'passed', 'yes', 'not applicable', 'n/a'].includes(s);
      return true;
    });

    const getStatusChip = (status) => {
      const s = String(status || '').trim().toLowerCase();
      if (['fulfilled', 'ok', 'pass', 'passed', 'yes', 'match'].includes(s)) {
        return (
          <Chip
            size="small"
            icon={<CheckCircleIcon sx={{ fontSize: 16 }} />}
            label="MATCH / OK"
            sx={{ bgcolor: '#e8f5e9', color: '#2e7d32', fontWeight: 600, border: '1px solid #a5d6a7' }}
          />
        );
      }
      if (['mismatch', 'failed', 'not fulfilled', 'fail'].includes(s)) {
        return (
          <Chip
            size="small"
            icon={<CancelIcon sx={{ fontSize: 16 }} />}
            label="MISMATCH"
            sx={{ bgcolor: '#ffebee', color: '#c62828', fontWeight: 600, border: '1px solid #ef9a9a' }}
          />
        );
      }
      if (['partial_match', 'needs review', 'review', 'warning'].includes(s)) {
        return (
          <Chip
            size="small"
            icon={<WarningIcon sx={{ fontSize: 16 }} />}
            label="NEEDS REVIEW"
            sx={{ bgcolor: '#fff8e1', color: '#f57f17', fontWeight: 600, border: '1px solid #ffe082' }}
          />
        );
      }
      return (
        <Chip
          size="small"
          icon={<HelpIcon sx={{ fontSize: 16 }} />}
          label={status || 'N/A'}
          sx={{ bgcolor: '#f5f5f5', color: '#757575', fontWeight: 600, border: '1px solid #e0e0e0' }}
        />
      );
    };

    return (
      <Stack spacing={3} sx={{ mt: 3 }}>
        {/* Summary Card with Metrics */}
        <Paper
          elevation={1}
          sx={{
            p: 2.5,
            bgcolor: 'background.paper',
            borderRadius: 2,
            border: '1px solid',
            borderColor: overallStatus === 'PASS' ? '#a5d6a7' : (overallStatus === 'FAIL' ? '#ef9a9a' : '#ffe082')
          }}
        >
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5, flexWrap: 'wrap', gap: 1 }}>
            <Typography variant="h6" fontWeight="bold" display="flex" alignItems="center" gap={1} color="primary.main">
              <PinDropIcon />
              Map Address Verification Summary
            </Typography>
            <Chip
              label={`Status: ${overallStatus}`}
              sx={{
                fontWeight: 'bold',
                fontSize: '0.85rem',
                bgcolor: overallStatus === 'PASS' ? '#2e7d32' : (overallStatus === 'FAIL' ? '#c62828' : '#f57f17'),
                color: 'white'
              }}
            />
          </Box>
          <Typography variant="body2" sx={{ lineHeight: 1.6, color: 'text.secondary', mb: 2 }}>
            {summary || 'Verification between Sales Comparison approach and Location/Aerial maps completed.'}
          </Typography>

          {/* Metric Chips */}
          <Stack direction="row" spacing={1.5} flexWrap="wrap" sx={{ gap: 1 }}>
            <Chip
              label={`Total Properties: ${metrics.total_properties || (subjVerif ? 1 + compsVerif.length : parsedDetails.length)}`}
              variant="outlined"
              size="small"
              sx={{ fontWeight: 'bold' }}
            />
            <Chip
              label={`Verified / Matched: ${metrics.matched_count || metrics.verified_count || 0}`}
              color="success"
              size="small"
              sx={{ fontWeight: 'bold' }}
            />
            {metrics.mismatch_count > 0 && (
              <Chip
                label={`Discrepancies: ${metrics.mismatch_count}`}
                color="error"
                size="small"
                sx={{ fontWeight: 'bold' }}
              />
            )}
            {metrics.missing_count > 0 && (
              <Chip
                label={`Missing on Map: ${metrics.missing_count}`}
                color="warning"
                size="small"
                sx={{ fontWeight: 'bold' }}
              />
            )}
            <Chip
              label={`Maps Detected: ${mapsDetected.length}`}
              color="primary"
              variant="outlined"
              size="small"
              sx={{ fontWeight: 'bold' }}
            />
          </Stack>
        </Paper>

        {/* Side-by-Side Detailed Property Comparison Table (if structured data available) */}
        {(subjVerif || compsVerif.length > 0) && (
          <Paper elevation={1} sx={{ p: 2, borderRadius: 2 }}>
            <Typography variant="subtitle1" fontWeight="bold" color="primary.main" sx={{ mb: 1.5 }}>
              Side-by-Side Property Address & Proximity Audit
            </Typography>
            <TableContainer sx={{ border: '1px solid rgba(224, 224, 224, 0.7)', borderRadius: 1.5 }}>
              <Table size="small">
                <TableHead sx={{ bgcolor: 'action.hover' }}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 'bold', width: '15%' }}>Property</TableCell>
                    <TableCell sx={{ fontWeight: 'bold', width: '25%' }}>Sales Comparison Grid</TableCell>
                    <TableCell sx={{ fontWeight: 'bold', width: '25%' }}>Location Map Callout</TableCell>
                    <TableCell sx={{ fontWeight: 'bold', width: '15%' }}>Status</TableCell>
                    <TableCell sx={{ fontWeight: 'bold', width: '20%' }}>Verification Notes</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {/* Subject Row */}
                  {subjVerif && (
                    <TableRow hover sx={{ bgcolor: subjVerif.status === 'MATCH' ? 'rgba(232, 245, 233, 0.3)' : 'inherit' }}>
                      <TableCell sx={{ fontWeight: 'bold' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <PinDropIcon fontSize="small" color="primary" />
                          Subject Property
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" fontWeight="medium">
                          {subjVerif.sales_comparison_address || 'N/A'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" color={subjVerif.location_map_address ? 'text.primary' : 'text.secondary'}>
                          {subjVerif.location_map_address || (subjVerif.aerial_map_address ? `Aerial: ${subjVerif.aerial_map_address}` : 'Callout not detected')}
                        </Typography>
                      </TableCell>
                      <TableCell>{getStatusChip(subjVerif.status)}</TableCell>
                      <TableCell>
                        <Typography variant="caption" color="text.secondary">
                          {subjVerif.details}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  )}

                  {/* Comparable Rows */}
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
                        <Typography variant="body2" color={c.map_address ? 'text.primary' : 'text.secondary'}>
                          {c.map_address || 'Pin callout not detected'}
                        </Typography>
                        {c.map_proximity && (
                          <Typography variant="caption" color="text.secondary" display="block">
                            Pin: {c.map_proximity} {c.map_label ? `(${c.map_label})` : ''}
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell>{getStatusChip(c.status)}</TableCell>
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
          </Paper>
        )}

        {/* Requirements Checklist Table */}
        <Paper elevation={1} sx={{ p: 2, borderRadius: 2 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }} flexWrap="wrap" gap={1}>
            <Typography variant="subtitle1" fontWeight="bold" color="primary.main">
              Verification Audit Items
            </Typography>
            <FormControl size="small" sx={{ minWidth: 160 }}>
              <InputLabel id="map-status-filter-label">Filter Items</InputLabel>
              <Select
                labelId="map-status-filter-label"
                id="map-status-filter"
                value={filterValue}
                label="Filter Items"
                onChange={(e) => setFilterValue(e.target.value)}
              >
                <MenuItem value="all">All Items</MenuItem>
                <MenuItem value="passed">Fulfilled / Passed</MenuItem>
                <MenuItem value="failed">Failed / Needs Review</MenuItem>
              </Select>
            </FormControl>
          </Stack>

          <TableContainer>
            <Table size="small">
              <TableHead sx={{ bgcolor: 'action.hover' }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: 'bold' }}>Requirement</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Status</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Audit Findings & Explanation</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredDetails.length > 0 ? (
                  filteredDetails.map((item, index) => (
                    <TableRow key={index} hover>
                      <TableCell sx={{ fontWeight: 500 }}>{item.requirement}</TableCell>
                      <TableCell>{getStatusChip(item.status)}</TableCell>
                      <TableCell sx={{ fontSize: '0.875rem' }}>{item.value_or_comment}</TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={3} align="center" sx={{ py: 3, color: 'text.secondary' }}>
                      No items match the selected filter.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>

        {/* Detected Map Exhibits Section */}
        {mapsDetected.length > 0 && (
          <Paper elevation={1} sx={{ p: 2, borderRadius: 2 }}>
            <Typography variant="subtitle1" fontWeight="bold" color="primary.main" sx={{ mb: 1.5, display: 'flex', alignItems: 'center', gap: 1 }}>
              <MapIcon />
              Detected Map Exhibits ({mapsDetected.length})
            </Typography>
            <Grid container spacing={2}>
              {mapsDetected.map((m, idx) => (
                <Grid item xs={12} sm={6} md={4} key={idx}>
                  <Card
                    variant="outlined"
                    sx={{
                      borderRadius: 2,
                      overflow: 'hidden',
                      transition: 'all 0.2s',
                      '&:hover': { boxShadow: 3 }
                    }}
                  >
                    {m.image_preview ? (
                      <Box sx={{ position: 'relative', cursor: 'pointer' }} onClick={() => setPreviewImage(m)}>
                        <CardMedia
                          component="img"
                          height="180"
                          image={m.image_preview}
                          alt={m.map_type}
                          sx={{ objectFit: 'cover' }}
                        />
                        <Box
                          sx={{
                            position: 'absolute',
                            top: 8,
                            right: 8,
                            bgcolor: 'rgba(0,0,0,0.6)',
                            color: 'white',
                            borderRadius: '50%',
                            p: 0.5
                          }}
                        >
                          <ZoomInIcon fontSize="small" />
                        </Box>
                      </Box>
                    ) : (
                      <Box
                        sx={{
                          height: 180,
                          bgcolor: 'action.hover',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                      >
                        <SatelliteIcon sx={{ fontSize: 48, color: 'text.secondary' }} />
                      </Box>
                    )}
                    <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                      <Typography variant="subtitle2" fontWeight="bold">
                        {m.map_type} (Page {m.page})
                      </Typography>
                      <Stack direction="row" spacing={1} sx={{ mt: 0.5 }} flexWrap="wrap">
                        <Chip size="small" label={`Provider: ${m.provider || 'Auto'}`} variant="outlined" />
                        {m.comparables_count !== undefined && (
                          <Chip size="small" label={`${m.comparables_count} Pins`} color="primary" variant="outlined" />
                        )}
                      </Stack>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </Paper>
        )}
      </Stack>
    );
  }, [response, filterValue]);

  return (
    <Paper elevation={2} sx={{ p: 3, mb: 4, borderRadius: 2 }}>
      <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', sm: 'center' }} gap={2}>
        <Box>
          <Typography variant="h6" fontWeight="bold" display="flex" alignItems="center" gap={1} color="primary.main">
            <MapIcon />
            Map Address Verification
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Cross-verifies Subject Address and Comparable Addresses & Proximities from the Sales Comparison Section against Location Map and Aerial Map exhibits.
          </Typography>
        </Box>
        <Button
          variant="contained"
          color="primary"
          onClick={handleCheck}
          disabled={loading}
          startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <LocationSearchingIcon />}
          sx={{ minWidth: 200, whiteSpace: 'nowrap' }}
        >
          {loading ? 'Verifying Maps...' : 'Verify Map Addresses'}
        </Button>
      </Stack>

      {error && (
        <Alert severity="error" sx={{ mt: 2 }}>
          {typeof error === 'string' ? error : (error.message || 'Error executing map address verification.')}
        </Alert>
      )}

      {renderContent()}

      {/* Image Preview Zoom Dialog */}
      <Dialog
        open={Boolean(previewImage)}
        onClose={() => setPreviewImage(null)}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6">
            {previewImage?.map_type} - Page {previewImage?.page} ({previewImage?.provider})
          </Typography>
          <IconButton onClick={() => setPreviewImage(null)} size="small">
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ textAlign: 'center', p: 2 }}>
          {previewImage?.image_preview && (
            <img
              src={previewImage.image_preview}
              alt={previewImage.map_type}
              style={{ maxWidth: '100%', maxHeight: '80vh', objectFit: 'contain', borderRadius: 8 }}
            />
          )}
        </DialogContent>
      </Dialog>
    </Paper>
  );
};

export default MapVerificationCheck;
