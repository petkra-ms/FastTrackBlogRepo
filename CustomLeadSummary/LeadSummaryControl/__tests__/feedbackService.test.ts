import {
    feedbackEntityName,
    saveFeedback,
    getFeedbackForLead,
} from "../services/feedbackService";

function makeMockWebAPI(
    overrides: Partial<ComponentFramework.WebApi> = {}
): ComponentFramework.WebApi {
    return {
        createRecord: jest.fn().mockResolvedValue({ id: "new-record-id" }),
        retrieveMultipleRecords: jest.fn().mockResolvedValue({ entities: [] }),
        updateRecord: jest.fn().mockResolvedValue({}),
        deleteRecord: jest.fn().mockResolvedValue({}),
        ...overrides,
    } as unknown as ComponentFramework.WebApi;
}

describe("feedbackService", () => {
    describe("feedbackEntityName", () => {
        it("generates the correct entity name", () => {
            expect(feedbackEntityName("cr123")).toBe("cr123_leadsummaryfeedback");
        });

        it("handles different prefixes", () => {
            expect(feedbackEntityName("xyz")).toBe("xyz_leadsummaryfeedback");
        });
    });

    describe("saveFeedback", () => {
        it("creates a ThumbsUp record with correct fields", async () => {
            const webAPI = makeMockWebAPI();

            const id = await saveFeedback(
                webAPI, "lead-1", "user-1", "ThumbsUp", "Great!", "yes", "cr123"
            );

            expect(id).toBe("new-record-id");
            expect(webAPI.createRecord).toHaveBeenCalledWith(
                "cr123_leadsummaryfeedback",
                expect.objectContaining({
                    "cr123_leadid_leadid@odata.bind": "/leads(lead-1)",
                    "cr123_submittedby_systemuserid@odata.bind": "/systemusers(user-1)",
                    "cr123_feedbacktype": 1, // ThumbsUp
                    "cr123_airelevanceverdict": 1, // yes
                    "cr123_comment": "Great!",
                })
            );
        });

        it("creates a ThumbsDown record", async () => {
            const webAPI = makeMockWebAPI();

            await saveFeedback(
                webAPI, "lead-2", "user-2", "ThumbsDown", undefined, "no", "cr123"
            );

            expect(webAPI.createRecord).toHaveBeenCalledWith(
                "cr123_leadsummaryfeedback",
                expect.objectContaining({
                    "cr123_feedbacktype": 2, // ThumbsDown
                    "cr123_airelevanceverdict": 2, // no
                })
            );
        });

        it("maps 'unclear' verdict to option set value 3", async () => {
            const webAPI = makeMockWebAPI();

            await saveFeedback(
                webAPI, "lead-3", "user-3", "ThumbsUp", undefined, "unclear", "cr123"
            );

            expect(webAPI.createRecord).toHaveBeenCalledWith(
                "cr123_leadsummaryfeedback",
                expect.objectContaining({
                    "cr123_airelevanceverdict": 3,
                })
            );
        });

        it("omits comment when empty/undefined", async () => {
            const webAPI = makeMockWebAPI();

            await saveFeedback(
                webAPI, "lead-4", "user-4", "ThumbsUp", "", "yes", "cr123"
            );

            const record = (webAPI.createRecord as jest.Mock).mock.calls[0][1] as Record<string, unknown>;
            expect(record).not.toHaveProperty("cr123_comment");
        });
    });

    describe("getFeedbackForLead", () => {
        it("returns mapped feedback records", async () => {
            const webAPI = makeMockWebAPI({
                retrieveMultipleRecords: jest.fn().mockResolvedValue({
                    entities: [
                        {
                            cr123_leadsummaryfeedbackid: "fb-1",
                            cr123_feedbacktype: 1,
                            cr123_comment: "Helpful",
                            cr123_airelevanceverdict: 1,
                            createdon: "2026-04-15T10:00:00Z",
                        },
                        {
                            cr123_leadsummaryfeedbackid: "fb-2",
                            cr123_feedbacktype: 2,
                            cr123_comment: undefined,
                            cr123_airelevanceverdict: 2,
                            createdon: "2026-04-15T09:00:00Z",
                        },
                    ],
                }),
            });

            const records = await getFeedbackForLead(webAPI, "lead-1", "cr123");

            expect(records).toHaveLength(2);
            expect(records[0]).toEqual({
                id: "fb-1",
                feedbackType: "ThumbsUp",
                comment: "Helpful",
                aiVerdict: "yes",
                createdOn: "2026-04-15T10:00:00Z",
            });
            expect(records[1]).toEqual({
                id: "fb-2",
                feedbackType: "ThumbsDown",
                comment: undefined,
                aiVerdict: "no",
                createdOn: "2026-04-15T09:00:00Z",
            });
        });

        it("returns empty array when no records exist", async () => {
            const webAPI = makeMockWebAPI();
            const records = await getFeedbackForLead(webAPI, "lead-empty", "cr123");
            expect(records).toEqual([]);
        });
    });
});
