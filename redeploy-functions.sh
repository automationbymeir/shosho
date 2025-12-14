#!/bin/bash

# Delete and Redeploy Script
# This script deletes all existing functions and deploys fresh

echo "🗑️  Deleting all existing Cloud Functions..."

firebase functions:delete getAuthUrl --force
firebase functions:delete oauthCallback --force
firebase functions:delete createPickerSession --force
firebase functions:delete checkPickerSession --force
firebase functions:delete fetchThumbnailBatch --force
firebase functions:delete createPhotoBook --force
firebase functions:delete exportAsPdf --force
firebase functions:delete saveProject --force
firebase functions:delete loadProject --force
firebase functions:delete listProjects --force
firebase functions:delete deleteProject --force

echo ""
echo "✅ All functions deleted"
echo ""
echo "🚀 Deploying fresh functions..."
echo ""

firebase deploy --only functions

echo ""
echo "✅ Deployment complete!"
