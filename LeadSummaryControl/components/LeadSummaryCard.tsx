import * as React from "react";
import {
    Spinner,
    Text,
    Card,
    CardHeader,
    Badge,
    tokens,
    makeStyles,
} from "@fluentui/react-components";

// ─── Styles ───────────────────────────────────────────────────────────────────

const useStyles = makeStyles({
    card: {
        padding: tokens.spacingVerticalM,
        gap: tokens.spacingVerticalS,
        display: "flex",
        flexDirection: "column",
    },
    errorText: {
        color: tokens.colorPaletteRedForeground1,
    },
    factorList: {
        margin: 0,
        paddingLeft: tokens.spacingHorizontalL,
    },
    disclaimer: {
        color: tokens.colorNeutralForeground3,
        fontStyle: "italic",
    },
});

// ─── Props ────────────────────────────────────────────────────────────────────

export interface ILeadSummaryCardProps {
    /** AI-generated summary; undefined while loading or on error */
    summary?: string;
    /** Key factors influencing the AI assessment */
    keyFactors?: string[];
    /** True while the AI call is in flight */
    isLoading: boolean;
    /** Non-null when the AI call failed */
    error?: string;
}

// ─── Component ────────────────────────────────────────────────────────────────

export const LeadSummaryCard: React.FC<ILeadSummaryCardProps> = ({
    summary,
    keyFactors,
    isLoading,
    error,
}) => {
    const styles = useStyles();

    return (
        <Card className={styles.card}>
            <CardHeader
                header={<Text weight="semibold" size={400}>Lead Summary</Text>}
                action={<Badge appearance="outline" color="informative">AI suggestion</Badge>}
            />

            {isLoading && <Spinner label="Analysing lead…" size="small" />}

            {!isLoading && error && (
                <Text className={styles.errorText} size={200}>
                    ⚠ AI summary unavailable: {error}
                </Text>
            )}

            {!isLoading && summary && (
                <>
                    <Text size={300}>{summary}</Text>

                    {keyFactors && keyFactors.length > 0 && (
                        <>
                            <Text weight="semibold" size={200}>Key factors:</Text>
                            <ul className={styles.factorList}>
                                {keyFactors.map((factor, i) => (
                                    <li key={i}><Text size={200}>{factor}</Text></li>
                                ))}
                            </ul>
                        </>
                    )}

                    <Text className={styles.disclaimer} size={100}>
                        AI-generated suggestion. Final decision remains yours.
                    </Text>
                </>
            )}
        </Card>
    );
};
