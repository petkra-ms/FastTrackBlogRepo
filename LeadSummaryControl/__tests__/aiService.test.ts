import { callCopilotAgent, AISummaryResult } from "../services/aiService";

// Re-export parseAIResponse for direct testing by calling callCopilotAgent
// with a mock copilot that returns controlled text

function makeMockCopilot(responseText: string): ComponentFramework.Copilot {
    return {
        executeEvent: jest.fn().mockResolvedValue([
            { type: "message", text: responseText },
        ]),
    } as unknown as ComponentFramework.Copilot;
}

function makeMockCopilotNoMessage(): ComponentFramework.Copilot {
    return {
        executeEvent: jest.fn().mockResolvedValue([
            { type: "status", text: "done" },
        ]),
    } as unknown as ComponentFramework.Copilot;
}

function makeMockCopilotTimeout(): ComponentFramework.Copilot {
    return {
        executeEvent: jest.fn().mockImplementation(
            () => new Promise(() => { /* never resolves */ })
        ),
    } as unknown as ComponentFramework.Copilot;
}

describe("aiService", () => {
    describe("callCopilotAgent", () => {
        it("parses a valid response with all fields", async () => {
            const json = JSON.stringify({
                summary: "Corporate inquiry about product pricing.",
                isSalesRelevant: "yes",
                keyFactors: ["Corporate email domain", "Product inquiry mentioned"],
                recommendationText: "Consider updating the company name.",
                fieldRecommendations: [
                    { fieldName: "companyname", displayName: "Company Name", recommendedValue: "Contoso Ltd" },
                ],
            });
            const copilot = makeMockCopilot(json);

            const result = await callCopilotAgent(copilot, "testEvent", "lead-123");

            expect(result).toEqual<AISummaryResult>({
                summary: "Corporate inquiry about product pricing.",
                isSalesRelevant: "yes",
                keyFactors: ["Corporate email domain", "Product inquiry mentioned"],
                recommendationText: "Consider updating the company name.",
                fieldRecommendations: [
                    { fieldName: "companyname", displayName: "Company Name", recommendedValue: "Contoso Ltd" },
                ],
            });
            expect(copilot.executeEvent).toHaveBeenCalledWith("testEvent", { leadId: "lead-123" });
        });

        it("handles response without keyFactors or recommendations", async () => {
            const json = JSON.stringify({
                summary: "Job seeker inquiry.",
                isSalesRelevant: "no",
            });
            const copilot = makeMockCopilot(json);

            const result = await callCopilotAgent(copilot, "testEvent", "lead-456");

            expect(result.keyFactors).toEqual([]);
            expect(result.isSalesRelevant).toBe("no");
            expect(result.recommendationText).toBe("");
            expect(result.fieldRecommendations).toEqual([]);
        });

        it("normalises unknown isSalesRelevant values to 'unclear'", async () => {
            const json = JSON.stringify({
                summary: "Ambiguous message.",
                isSalesRelevant: "maybe",
                keyFactors: [],
            });
            const copilot = makeMockCopilot(json);

            const result = await callCopilotAgent(copilot, "testEvent", "lead-789");

            expect(result.isSalesRelevant).toBe("unclear");
        });

        it("strips markdown code fences from response", async () => {
            const wrapped = "```json\n" + JSON.stringify({
                summary: "Valid inside fences.",
                isSalesRelevant: "yes",
                keyFactors: ["fence test"],
            }) + "\n```";
            const copilot = makeMockCopilot(wrapped);

            const result = await callCopilotAgent(copilot, "testEvent", "lead-abc");

            expect(result.summary).toBe("Valid inside fences.");
        });

        it("throws when no message response is returned", async () => {
            const copilot = makeMockCopilotNoMessage();

            await expect(
                callCopilotAgent(copilot, "testEvent", "lead-000")
            ).rejects.toThrow("Copilot agent returned no text response");
        });

        it("throws on timeout", async () => {
            jest.useFakeTimers();
            const copilot = makeMockCopilotTimeout();

            const promise = callCopilotAgent(copilot, "testEvent", "lead-timeout");

            jest.advanceTimersByTime(31_000);
            await expect(promise).rejects.toThrow("AI request timed out");

            jest.useRealTimers();
        });

        it("filters non-string entries from keyFactors", async () => {
            const json = JSON.stringify({
                summary: "Test.",
                isSalesRelevant: "yes",
                keyFactors: ["valid", 42, null, "also valid"],
            });
            const copilot = makeMockCopilot(json);

            const result = await callCopilotAgent(copilot, "testEvent", "lead-filter");

            expect(result.keyFactors).toEqual(["valid", "also valid"]);
        });

        it("filters invalid fieldRecommendations entries", async () => {
            const json = JSON.stringify({
                summary: "Test.",
                isSalesRelevant: "yes",
                keyFactors: [],
                fieldRecommendations: [
                    { fieldName: "companyname", displayName: "Company Name", recommendedValue: "Contoso" },
                    { fieldName: "bad" }, // missing displayName and recommendedValue
                    null,
                    { fieldName: "email", displayName: "Email", recommendedValue: "test@test.com" },
                ],
            });
            const copilot = makeMockCopilot(json);

            const result = await callCopilotAgent(copilot, "testEvent", "lead-rec-filter");

            expect(result.fieldRecommendations).toEqual([
                { fieldName: "companyname", displayName: "Company Name", recommendedValue: "Contoso" },
                { fieldName: "email", displayName: "Email", recommendedValue: "test@test.com" },
            ]);
        });
    });
});
