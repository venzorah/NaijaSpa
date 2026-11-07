# Business profile photos

Vendor photo management now lives in Business profile. Change cover and the logo button open the device file picker directly, upload to the owned Profile photos album through the existing R2/local upload API, and select that image as the cover/logo. Choose existing cover/logo still reuses previously uploaded photos. Failed assignment leaves the uploaded photo available to select again.

Business photos includes a multiple-file Upload photos button and retains existing photo, therapist-album and paid video controls. Image URL entry has been removed from the interface. Each photo form has a full-width Upload photo button below its fields; it stays disabled until a non-empty photo within the size limit is selected, disables during upload, and resets after success. Therapist albums and videos are grouped under a disclosure. Existing albums and images are preserved; server quota and file validation rules are unchanged.

The separate Galleries navigation item is removed. `/vendor/galleries` redirects to `/vendor/profile#business-photos`, and vendor help points to Business profile. Upload/storage APIs remain available for profile photos and service featured-image selection.

Deleting an image or album currently used as a business cover/logo returns 409 until a replacement is selected. Existing service featured-image deletion protection also remains. No database migration is required.
