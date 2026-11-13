#!/usr/bin/env bash
# Start script for Render: prepare the database, seed the SRD reference data the first
# time, then boot Puma.
set -e

# Creates the schema on an empty database, or runs pending migrations.
bundle exec rails db:prepare

# Seeds are safe to re-run, but skip them once the data is there to keep restarts fast.
bundle exec rails runner 'load Rails.root.join("db/seeds.rb") if Monster.none? || CharClass.none? || CharRace.none?'

# Published (non-SRD) races, subclasses, classes and feats: a quick upsert, so it runs on every deploy
# and picks up edits to the files in db/seeds/data/.
bundle exec rails runner 'load Rails.root.join("db/seeds/published_races.rb"); load Rails.root.join("db/seeds/published_content.rb")'

exec bundle exec puma -C config/puma.rb
