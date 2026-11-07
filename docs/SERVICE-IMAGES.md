# Service featured images

Vendor Services and admin Services now share a create/edit modal with a featured-photo preview. Upload from the device or choose an existing photo from the business's gallery. The image is staged until Save service; cancelling the editor does not upload it. Existing services can replace or remove their featured photo. Admin-created services start hidden and retain the existing moderation workflow.

The Galleries header's Upload photos button immediately opens the device file picker and uploads the selected images to the chosen gallery. Multiple files upload sequentially and respect existing gallery limits. A gallery photo used by a service cannot be deleted until it is replaced or removed from that service.

Uploads accept JPEG, PNG, WebP and GIF, validate actual file signatures, and limit service images to 2 MB. Service uploads use immutable UUID URLs backed by the configured R2/local storage. Failed database writes clean up new files; replaced service uploads are removed only when no service, gallery or vendor profile references them. Existing gallery photos are reused without deleting shared files. No database migration is required.

Homepage and Explore cards display the service's featured image. Book now links open the service's existing booking form. Existing services retain their current image until changed.
