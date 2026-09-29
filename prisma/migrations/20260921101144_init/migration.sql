-- CreateTable
CREATE TABLE "users" (
    "user_id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE "consents" (
    "consent_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "scope" TEXT NOT NULL,
    "granted" BOOLEAN NOT NULL,
    "granted_at" TIMESTAMP(3),
    "revoked_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "consents_pkey" PRIMARY KEY ("consent_id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "log_id" TEXT NOT NULL,
    "user_id" TEXT,
    "action" TEXT NOT NULL,
    "resource" TEXT NOT NULL,
    "resource_id" TEXT,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "status_code" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("log_id")
);

-- CreateTable
CREATE TABLE "patient_profiles" (
    "patient_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "date_of_birth" TIMESTAMP(3),
    "sex" TEXT,
    "blood_group" TEXT,
    "preferences" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "patient_profiles_pkey" PRIMARY KEY ("patient_id")
);

-- CreateTable
CREATE TABLE "medical_conditions" (
    "condition_id" TEXT NOT NULL,
    "patient_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "icd_code" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "onset_date" TIMESTAMP(3),
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "provenance_id" TEXT,

    CONSTRAINT "medical_conditions_pkey" PRIMARY KEY ("condition_id")
);

-- CreateTable
CREATE TABLE "allergies" (
    "allergy_id" TEXT NOT NULL,
    "patient_id" TEXT NOT NULL,
    "substance" TEXT NOT NULL,
    "reaction" TEXT,
    "severity" TEXT,
    "onset_date" TIMESTAMP(3),
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "provenance_id" TEXT,

    CONSTRAINT "allergies_pkey" PRIMARY KEY ("allergy_id")
);

-- CreateTable
CREATE TABLE "medications" (
    "medication_id" TEXT NOT NULL,
    "patient_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "rx_norm_code" TEXT,
    "dose" TEXT,
    "frequency" TEXT,
    "route" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "started_at" TIMESTAMP(3),
    "stopped_at" TIMESTAMP(3),
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "provenance_id" TEXT,

    CONSTRAINT "medications_pkey" PRIMARY KEY ("medication_id")
);

-- CreateTable
CREATE TABLE "lab_results" (
    "lab_id" TEXT NOT NULL,
    "patient_id" TEXT NOT NULL,
    "test_name" TEXT NOT NULL,
    "loinc_code" TEXT,
    "value" DOUBLE PRECISION,
    "value_text" TEXT,
    "unit" TEXT,
    "reference_range" TEXT,
    "is_abnormal" BOOLEAN,
    "observed_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "provenance_id" TEXT,

    CONSTRAINT "lab_results_pkey" PRIMARY KEY ("lab_id")
);

-- CreateTable
CREATE TABLE "encounters" (
    "encounter_id" TEXT NOT NULL,
    "patient_id" TEXT NOT NULL,
    "risk_level" TEXT NOT NULL DEFAULT 'LOW',
    "intent" TEXT,
    "status" TEXT NOT NULL DEFAULT 'IN_PROGRESS',
    "flagged_for_review" BOOLEAN NOT NULL DEFAULT false,
    "model_version" TEXT,
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ended_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "encounters_pkey" PRIMARY KEY ("encounter_id")
);

-- CreateTable
CREATE TABLE "conversations" (
    "conversation_id" TEXT NOT NULL,
    "encounter_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "conversations_pkey" PRIMARY KEY ("conversation_id")
);

-- CreateTable
CREATE TABLE "messages" (
    "message_id" TEXT NOT NULL,
    "conversation_id" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "messages_pkey" PRIMARY KEY ("message_id")
);

-- CreateTable
CREATE TABLE "symptom_states" (
    "state_id" TEXT NOT NULL,
    "encounter_id" TEXT NOT NULL,
    "primary_symptom" TEXT,
    "onset" TEXT,
    "duration" TEXT,
    "severity" INTEGER,
    "character" TEXT,
    "location" TEXT,
    "radiation" TEXT,
    "aggravating_factors" TEXT,
    "relieving_factors" TEXT,
    "associated_symptoms" JSONB,
    "extraction_confidence" DOUBLE PRECISION,
    "is_complete" BOOLEAN NOT NULL DEFAULT false,
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "symptom_states_pkey" PRIMARY KEY ("state_id")
);

-- CreateTable
CREATE TABLE "tool_calls" (
    "tool_call_id" TEXT NOT NULL,
    "encounter_id" TEXT NOT NULL,
    "tool_name" TEXT NOT NULL,
    "arguments" JSONB NOT NULL,
    "result" JSONB,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "latency_ms" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tool_calls_pkey" PRIMARY KEY ("tool_call_id")
);

-- CreateTable
CREATE TABLE "model_runs" (
    "run_id" TEXT NOT NULL,
    "encounter_id" TEXT NOT NULL,
    "model_name" TEXT NOT NULL,
    "model_version" TEXT NOT NULL,
    "prompt_hash" TEXT,
    "input_tokens" INTEGER,
    "output_tokens" INTEGER,
    "latency_ms" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "model_runs_pkey" PRIMARY KEY ("run_id")
);

-- CreateTable
CREATE TABLE "health_events" (
    "event_id" TEXT NOT NULL,
    "patient_id" TEXT NOT NULL,
    "encounter_id" TEXT,
    "event_type" TEXT NOT NULL,
    "event_time" TIMESTAMP(3) NOT NULL,
    "summary" TEXT NOT NULL,
    "structured_data" JSONB,
    "source_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "provenance_id" TEXT,

    CONSTRAINT "health_events_pkey" PRIMARY KEY ("event_id")
);

-- CreateTable
CREATE TABLE "health_documents" (
    "document_id" TEXT NOT NULL,
    "patient_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "original_filename" TEXT NOT NULL,
    "storage_uri" TEXT NOT NULL,
    "mime_type" TEXT,
    "extraction_status" TEXT NOT NULL DEFAULT 'pending',
    "uploaded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "provenance_id" TEXT,

    CONSTRAINT "health_documents_pkey" PRIMARY KEY ("document_id")
);

-- CreateTable
CREATE TABLE "extracted_fields" (
    "field_id" TEXT NOT NULL,
    "document_id" TEXT NOT NULL,
    "field_name" TEXT NOT NULL,
    "raw_value" TEXT NOT NULL,
    "normalized_value" TEXT,
    "rx_norm_code" TEXT,
    "loinc_code" TEXT,
    "icd_code" TEXT,
    "confidence" DOUBLE PRECISION NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "confirmed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "provenance_id" TEXT,

    CONSTRAINT "extracted_fields_pkey" PRIMARY KEY ("field_id")
);

-- CreateTable
CREATE TABLE "wearable_readings" (
    "reading_id" TEXT NOT NULL,
    "patient_id" TEXT NOT NULL,
    "metric" TEXT NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "unit" TEXT NOT NULL,
    "recorded_at" TIMESTAMP(3) NOT NULL,
    "source" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "wearable_readings_pkey" PRIMARY KEY ("reading_id")
);

-- CreateTable
CREATE TABLE "wearable_trends" (
    "trend_id" TEXT NOT NULL,
    "patient_id" TEXT NOT NULL,
    "metric" TEXT NOT NULL,
    "direction" TEXT NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "baseline" DOUBLE PRECISION NOT NULL,
    "unit" TEXT NOT NULL,
    "window_days" INTEGER NOT NULL DEFAULT 7,
    "computed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "wearable_trends_pkey" PRIMARY KEY ("trend_id")
);

-- CreateTable
CREATE TABLE "provenance" (
    "source_id" TEXT NOT NULL,
    "source_type" TEXT NOT NULL,
    "source_date" TIMESTAMP(3) NOT NULL,
    "document_id" TEXT,
    "page_number" INTEGER,
    "extraction_model" TEXT,
    "model_version" TEXT,
    "confidence" DOUBLE PRECISION,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "provenance_pkey" PRIMARY KEY ("source_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "consents_user_id_scope_idx" ON "consents"("user_id", "scope");

-- CreateIndex
CREATE UNIQUE INDEX "patient_profiles_user_id_key" ON "patient_profiles"("user_id");

-- CreateIndex
CREATE INDEX "medical_conditions_patient_id_status_idx" ON "medical_conditions"("patient_id", "status");

-- CreateIndex
CREATE INDEX "allergies_patient_id_idx" ON "allergies"("patient_id");

-- CreateIndex
CREATE INDEX "medications_patient_id_status_idx" ON "medications"("patient_id", "status");

-- CreateIndex
CREATE INDEX "lab_results_patient_id_observed_at_idx" ON "lab_results"("patient_id", "observed_at" DESC);

-- CreateIndex
CREATE INDEX "encounters_patient_id_status_idx" ON "encounters"("patient_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "symptom_states_encounter_id_key" ON "symptom_states"("encounter_id");

-- CreateIndex
CREATE INDEX "health_events_patient_id_event_time_idx" ON "health_events"("patient_id", "event_time" DESC);

-- CreateIndex
CREATE INDEX "health_events_patient_id_event_type_idx" ON "health_events"("patient_id", "event_type");

-- CreateIndex
CREATE INDEX "health_documents_patient_id_extraction_status_idx" ON "health_documents"("patient_id", "extraction_status");

-- CreateIndex
CREATE INDEX "extracted_fields_document_id_status_idx" ON "extracted_fields"("document_id", "status");

-- CreateIndex
CREATE INDEX "wearable_readings_patient_id_metric_recorded_at_idx" ON "wearable_readings"("patient_id", "metric", "recorded_at" DESC);

-- CreateIndex
CREATE INDEX "wearable_trends_patient_id_metric_idx" ON "wearable_trends"("patient_id", "metric");

-- AddForeignKey
ALTER TABLE "consents" ADD CONSTRAINT "consents_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patient_profiles" ADD CONSTRAINT "patient_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "medical_conditions" ADD CONSTRAINT "medical_conditions_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patient_profiles"("patient_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "medical_conditions" ADD CONSTRAINT "medical_conditions_provenance_id_fkey" FOREIGN KEY ("provenance_id") REFERENCES "provenance"("source_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "allergies" ADD CONSTRAINT "allergies_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patient_profiles"("patient_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "allergies" ADD CONSTRAINT "allergies_provenance_id_fkey" FOREIGN KEY ("provenance_id") REFERENCES "provenance"("source_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "medications" ADD CONSTRAINT "medications_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patient_profiles"("patient_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "medications" ADD CONSTRAINT "medications_provenance_id_fkey" FOREIGN KEY ("provenance_id") REFERENCES "provenance"("source_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lab_results" ADD CONSTRAINT "lab_results_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patient_profiles"("patient_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lab_results" ADD CONSTRAINT "lab_results_provenance_id_fkey" FOREIGN KEY ("provenance_id") REFERENCES "provenance"("source_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "encounters" ADD CONSTRAINT "encounters_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patient_profiles"("patient_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_encounter_id_fkey" FOREIGN KEY ("encounter_id") REFERENCES "encounters"("encounter_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "conversations"("conversation_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "symptom_states" ADD CONSTRAINT "symptom_states_encounter_id_fkey" FOREIGN KEY ("encounter_id") REFERENCES "encounters"("encounter_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tool_calls" ADD CONSTRAINT "tool_calls_encounter_id_fkey" FOREIGN KEY ("encounter_id") REFERENCES "encounters"("encounter_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "model_runs" ADD CONSTRAINT "model_runs_encounter_id_fkey" FOREIGN KEY ("encounter_id") REFERENCES "encounters"("encounter_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "health_events" ADD CONSTRAINT "health_events_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patient_profiles"("patient_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "health_events" ADD CONSTRAINT "health_events_encounter_id_fkey" FOREIGN KEY ("encounter_id") REFERENCES "encounters"("encounter_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "health_events" ADD CONSTRAINT "health_events_provenance_id_fkey" FOREIGN KEY ("provenance_id") REFERENCES "provenance"("source_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "health_documents" ADD CONSTRAINT "health_documents_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patient_profiles"("patient_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "health_documents" ADD CONSTRAINT "health_documents_provenance_id_fkey" FOREIGN KEY ("provenance_id") REFERENCES "provenance"("source_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "extracted_fields" ADD CONSTRAINT "extracted_fields_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "health_documents"("document_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "extracted_fields" ADD CONSTRAINT "extracted_fields_provenance_id_fkey" FOREIGN KEY ("provenance_id") REFERENCES "provenance"("source_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wearable_readings" ADD CONSTRAINT "wearable_readings_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patient_profiles"("patient_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wearable_trends" ADD CONSTRAINT "wearable_trends_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patient_profiles"("patient_id") ON DELETE CASCADE ON UPDATE CASCADE;
