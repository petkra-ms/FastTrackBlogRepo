import * as React from "react";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { LeadSummaryCard } from "../components/LeadSummaryCard";

// Fluent UI requires a wrapping provider; for unit tests we render directly
// since makeStyles may not fully resolve, but text content is testable.

describe("LeadSummaryCard", () => {
    it("renders loading spinner", () => {
        render(<LeadSummaryCard isLoading={true} />);
        expect(screen.getByText("Analysing lead…")).toBeInTheDocument();
    });

    it("renders error message when AI fails", () => {
        render(<LeadSummaryCard isLoading={false} error="Network error" />);
        expect(screen.getByText(/AI summary unavailable/)).toBeInTheDocument();
        expect(screen.getByText(/Network error/)).toBeInTheDocument();
    });

    it("renders summary text and disclaimer", () => {
        render(
            <LeadSummaryCard
                isLoading={false}
                summary="This lead is about product pricing."
            />
        );
        expect(screen.getByText("This lead is about product pricing.")).toBeInTheDocument();
        expect(screen.getByText("AI suggestion")).toBeInTheDocument();
        expect(screen.getByText(/Final decision remains yours/)).toBeInTheDocument();
    });

    it("renders key factors as a list", () => {
        render(
            <LeadSummaryCard
                isLoading={false}
                summary="Sales lead."
                keyFactors={["Corporate domain", "Product inquiry"]}
            />
        );
        expect(screen.getByText("Key factors:")).toBeInTheDocument();
        expect(screen.getByText("Corporate domain")).toBeInTheDocument();
        expect(screen.getByText("Product inquiry")).toBeInTheDocument();
    });

    it("does not render key factors section when array is empty", () => {
        render(
            <LeadSummaryCard
                isLoading={false}
                summary="Short summary."
                keyFactors={[]}
            />
        );
        expect(screen.queryByText("Key factors:")).not.toBeInTheDocument();
    });

    it("does not render summary or disclaimer while loading", () => {
        render(
            <LeadSummaryCard
                isLoading={true}
                summary="Should not appear"
                keyFactors={["Hidden"]}
            />
        );
        expect(screen.queryByText("Should not appear")).not.toBeInTheDocument();
        expect(screen.queryByText(/Final decision/)).not.toBeInTheDocument();
    });
});
