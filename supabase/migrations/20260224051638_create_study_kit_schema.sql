/*
  # Create Study Kit Generator Schema

  1. New Tables
    - `lectures`
      - `id` (uuid, primary key)
      - `title` (text)
      - `transcript` (text, the original lecture content)
      - `created_at` (timestamptz)
      - `user_id` (uuid, nullable for now - can be linked to auth later)
    
    - `study_kits`
      - `id` (uuid, primary key)
      - `lecture_id` (uuid, foreign key to lectures)
      - `cornell_notes` (jsonb, structured Cornell Method notes)
      - `flashcards` (jsonb, array of Q&A pairs)
      - `mindmap` (text, Mermaid.js code)
      - `chunks` (jsonb, array of text chunks for vector DB)
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on both tables
    - Add policies for public access (can be restricted later with auth)
*/

CREATE TABLE IF NOT EXISTS lectures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL DEFAULT 'Untitled Lecture',
  transcript text NOT NULL,
  created_at timestamptz DEFAULT now(),
  user_id uuid
);

CREATE TABLE IF NOT EXISTS study_kits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lecture_id uuid NOT NULL REFERENCES lectures(id) ON DELETE CASCADE,
  cornell_notes jsonb DEFAULT '{}'::jsonb,
  flashcards jsonb DEFAULT '[]'::jsonb,
  mindmap text DEFAULT '',
  chunks jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE lectures ENABLE ROW LEVEL SECURITY;
ALTER TABLE study_kits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access to lectures"
  ON lectures FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Allow public insert to lectures"
  ON lectures FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Allow public read access to study_kits"
  ON study_kits FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Allow public insert to study_kits"
  ON study_kits FOR INSERT
  TO public
  WITH CHECK (true);