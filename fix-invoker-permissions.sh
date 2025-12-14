#!/bin/bash

# Project ID and Region
PROJECT_ID="shoso-photobook"
REGION="us-central1"

echo "Fetching Cloud Run services for project $PROJECT_ID..."

# Get list of all Cloud Run services in the region
SERVICES=$(gcloud run services list --project="$PROJECT_ID" --region="$REGION" --format="value(SERVICE)")

if [ -z "$SERVICES" ]; then
  echo "No services found!"
  exit 1
fi

echo "Found services:"
echo "$SERVICES"
echo "--------------------------------"

# Loop through each service and add the public invoker role
for SERVICE in $SERVICES; do
  echo "Fixing permissions for: $SERVICE"
  
  gcloud run services add-iam-policy-binding "$SERVICE" \
    --project="$PROJECT_ID" \
    --region="$REGION" \
    --member="allUsers" \
    --role="roles/run.invoker" \
    --quiet
    
  echo "--------------------------------"
done

echo "Done! All services are now publicly accessible (CORS fixed)."
