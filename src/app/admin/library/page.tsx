import {requireAdminScreen} from "@/lib/admin-auth";import {AdminPageHeader} from "@/components/admin/page-header";import {AdminMediaLibrary} from "@/components/admin/media-library";
export default async function Page(){await requireAdminScreen("library");return <div><AdminPageHeader screen="library"/><AdminMediaLibrary/></div>;}
