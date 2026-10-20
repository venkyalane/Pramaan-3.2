import React from 'react';
import { SubjectInfoCard, GridInfoCard } from '../components/FormComponents';
import ActionButtons from '../components/ActionButtons';
import PhotosGallerySection from '../components/PhotosGallerySection';
import MapAndSketchExhibitsSection from '../components/MapAndSketchExhibitsSection';
import ComparableRentScheduleTable from '../components/ComparableRentScheduleTable';

const Form1007 = ({
  data, allData, extractionAttempted, handleDataChange, editingField, setEditingField,
  highlightedSubjectFields, subjectFields, appraiserFields, comparableRents,
  rentScheduleReconciliationFields, comparisonData, getComparisonStyle, loading, loadingSection,
  handleStateRequirementCheck, stateReqLoading, handleClientRequirementCheck, clientReqLoading,
  handleEscalationCheck, escalationLoading, manualValidations, handleManualValidation,
  onSubjectRevisionButtonClick, onCertificationRevisionButtonClick,
  on1007RevisionButtonClick, selectedFile, revisionHandlers
}) => (
  <>
    <ActionButtons
      handleStateRequirementCheck={handleStateRequirementCheck}
      stateReqLoading={stateReqLoading}
      handleClientRequirementCheck={handleClientRequirementCheck}
      clientReqLoading={clientReqLoading}
      handleEscalationCheck={handleEscalationCheck}
      escalationLoading={escalationLoading}
      revisionHandlers={revisionHandlers}
    />

    <SubjectInfoCard
      id="subject-info"
      title="Subject Information"
      fields={subjectFields}
      hideEmptyFields={true}
      data={data}
      extractionAttempted={extractionAttempted}
      onDataChange={handleDataChange}
      isEditable={true}
      editingField={editingField}
      setEditingField={setEditingField}
      highlightedFields={highlightedSubjectFields}
      allData={allData}
      comparisonData={comparisonData}
      getComparisonStyle={getComparisonStyle}
      loading={loading}
      loadingSection={loadingSection}
      manualValidations={manualValidations}
      handleManualValidation={handleManualValidation}
      onRevisionButtonClick={onSubjectRevisionButtonClick}
      revisionHandlers={revisionHandlers}
    />

    <ComparableRentScheduleTable
      data={data}
      allData={allData}
      comparableRents={comparableRents}
      extractionAttempted={extractionAttempted}
      handleDataChange={handleDataChange}
      editingField={editingField}
      setEditingField={setEditingField}
      manualValidations={manualValidations}
      handleManualValidation={handleManualValidation}
      revisionHandlers={revisionHandlers}
      on1007RevisionButtonClick={on1007RevisionButtonClick}
      isEditable={true}
    />

    <GridInfoCard
      id="rent-schedule-reconciliation-section"
      title="Comparable Rent Schedule Reconciliation"
      fields={rentScheduleReconciliationFields}
      data={data.RENT_SCHEDULE_RECONCILIATION || data}
      cardClass="bg-info"
      usePre={true}
      extractionAttempted={extractionAttempted}
      onDataChange={(field, value) => handleDataChange(field, value)}
      editingField={editingField}
      setEditingField={setEditingField}
      isEditable={true}
      loading={loading}
      loadingSection={loadingSection}
      manualValidations={manualValidations}
      handleManualValidation={handleManualValidation}
      revisionHandlers={revisionHandlers}
    />

    <GridInfoCard
      id="appraiser-section"
      title="CERTIFICATION"
      fields={appraiserFields}
      hideEmptyFields={true}
      data={data.CERTIFICATION || data}
      cardClass="bg-info"
      extractionAttempted={extractionAttempted}
      onDataChange={(field, value) => handleDataChange(['CERTIFICATION', ...field], value)}
      editingField={editingField}
      setEditingField={setEditingField}
      isEditable={true}
      allData={allData}
      loading={loading}
      loadingSection={loadingSection}
      manualValidations={manualValidations}
      handleManualValidation={handleManualValidation}
      onRevisionButtonClick={onCertificationRevisionButtonClick}
      revisionHandlers={revisionHandlers}
    />

    <MapAndSketchExhibitsSection id="map-sketch-exhibits-section" data={data} allData={allData} selectedFile={selectedFile} />
    <PhotosGallerySection id="photos-exhibits-section" data={data} allData={allData} extractedPhotos={allData?.EXTRACTED_PHOTOS || data?.EXTRACTED_PHOTOS || []} />
  </>
);

export default Form1007;
