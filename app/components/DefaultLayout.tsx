import { Notifications } from "./Notifications";
import { Logo } from "./Logo";
import { CreateIcon } from "../icons/CreateIcon";
import { ReactNode } from "react";
import { PageLinks } from "./PageLinks";
import { CreateWithAiLink } from "./CreateWithAiLink";
import { SidebarShell } from "./SidebarShell";
import { createRoomAction } from "../actions/createRoomAction";

export default function DefaultLayout({
  children,
}: {
  children: ReactNode;
}) {

  return (
    <div className="flex h-full max-h-full">
      <SidebarShell>
        <div className="flex items-center justify-between p-3">
          <div className="w-28 text-black">
            <Logo />
          </div>
          <div className="flex items-center gap-2">
            <form action={createRoomAction} className="flex items-center">
              <button>
                <span className="sr-only">Create new page</span>
                <CreateIcon className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>

        <div className="p-2 flex flex-col gap-0.5">
          <Notifications />
          <CreateWithAiLink />
        </div>

        <div className="text-xs font-medium text-gray-500 mt-6 pl-2">Pages</div>

        <PageLinks />
      </SidebarShell>

      <div className="relative flex flex-col h-full w-full">{children}</div>
    </div>
  );
}
