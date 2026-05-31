import { IInputs, IOutputs } from "./generated/ManifestTypes";
import * as React from "react";
import { LeadSummaryRoot } from "./components/LeadSummaryRoot";
import type { ILeadSummaryRootProps } from "./components/LeadSummaryRoot";
import type { AgentConfig } from "./services/agentClient";

export class LeadSummaryControl implements ComponentFramework.ReactControl<IInputs, IOutputs> {
    private notifyOutputChanged!: () => void;

    public init(
        _context: ComponentFramework.Context<IInputs>,
        notifyOutputChanged: () => void,
        _state: ComponentFramework.Dictionary
    ): void {
        this.notifyOutputChanged = notifyOutputChanged;
    }

    public updateView(context: ComponentFramework.Context<IInputs>): React.ReactElement {
        const publisherPrefix = context.parameters.publisherPrefix.raw ?? "";
        const salesRelevantFieldName = context.parameters.salesRelevantFieldName.raw ?? "";

        const agentConfig: AgentConfig = {
            clientId: context.parameters.clientId.raw ?? "",
            tenantId: context.parameters.tenantId.raw ?? "",
            environmentId: context.parameters.environmentId.raw ?? "",
            agentIdentifier: context.parameters.agentIdentifier.raw ?? "",
        };

        // Access the host page's entity record id (available in model-driven app context)
        interface PageContext { page?: { entityId?: string } }
        const leadId: string = (context as unknown as PageContext).page?.entityId ?? "";
        const userId: string = context.userSettings.userId ?? "";

        const props: ILeadSummaryRootProps = {
            agentConfig,
            publisherPrefix,
            salesRelevantFieldName,
            leadId,
            userId,
            webAPI: context.webAPI,
        };

        return React.createElement(LeadSummaryRoot, props);
    }

    public getOutputs(): IOutputs {
        return {};
    }

    public destroy(): void { /* nothing to clean up */ }
}

