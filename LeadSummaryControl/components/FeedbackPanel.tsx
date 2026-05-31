import * as React from "react";
import {
    Button,
    Textarea,
    Text,
    Spinner,
    tokens,
    makeStyles,
} from "@fluentui/react-components";
import { ThumbLike20Regular, ThumbDislike20Regular } from "@fluentui/react-icons";
import type { FeedbackType, FeedbackRecord } from "../services/feedbackService";

// ─── Styles ───────────────────────────────────────────────────────────────────

const useStyles = makeStyles({
    panel: {
        display: "flex",
        flexDirection: "column",
        gap: tokens.spacingVerticalS,
        paddingTop: tokens.spacingVerticalS,
    },
    buttonRow: {
        display: "flex",
        gap: tokens.spacingHorizontalS,
        alignItems: "center",
    },
    successText: {
        color: tokens.colorPaletteGreenForeground1,
    },
    errorText: {
        color: tokens.colorPaletteRedForeground1,
    },
    countText: {
        color: tokens.colorNeutralForeground3,
    },
});

// ─── Props ────────────────────────────────────────────────────────────────────

export interface IFeedbackPanelProps {
    /** All existing feedback records for this lead (for count display) */
    existingFeedback: FeedbackRecord[];
    /** True while a feedback save is in flight */
    isSaving: boolean;
    /** Non-null when the save failed */
    saveError?: string;
    /** True after a successful save in this session */
    saveSuccess: boolean;
    /** Called when the user submits feedback */
    onSubmit: (feedbackType: FeedbackType, comment: string | undefined) => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export const FeedbackPanel: React.FC<IFeedbackPanelProps> = ({
    existingFeedback,
    isSaving,
    saveError,
    saveSuccess,
    onSubmit,
}) => {
    const styles = useStyles();
    const [selected, setSelected] = React.useState<FeedbackType | null>(null);
    const [comment, setComment] = React.useState("");

    const handleSubmit = React.useCallback(() => {
        if (!selected) return;
        onSubmit(selected, comment.trim() || undefined);
    }, [selected, comment, onSubmit]);

    const thumbsUpCount = existingFeedback.filter(f => f.feedbackType === "ThumbsUp").length;
    const thumbsDownCount = existingFeedback.filter(f => f.feedbackType === "ThumbsDown").length;

    return (
        <div className={styles.panel}>
            <Text weight="semibold" size={300}>Was this summary helpful?</Text>

            <div className={styles.buttonRow}>
                <Button
                    icon={<ThumbLike20Regular />}
                    appearance={selected === "ThumbsUp" ? "primary" : "outline"}
                    onClick={() => setSelected("ThumbsUp")}
                    disabled={isSaving}
                    aria-label="Thumbs up"
                >
                    Yes
                </Button>
                <Button
                    icon={<ThumbDislike20Regular />}
                    appearance={selected === "ThumbsDown" ? "primary" : "outline"}
                    onClick={() => setSelected("ThumbsDown")}
                    disabled={isSaving}
                    aria-label="Thumbs down"
                >
                    No
                </Button>

                {existingFeedback.length > 0 && (
                    <Text className={styles.countText} size={200}>
                        👍 {thumbsUpCount} · 👎 {thumbsDownCount} total
                    </Text>
                )}
            </div>

            {selected !== null && !saveSuccess && (
                <>
                    <Textarea
                        placeholder="Optional comment…"
                        value={comment}
                        onChange={(_e, data) => setComment(data.value)}
                        disabled={isSaving}
                        rows={2}
                    />
                    <div className={styles.buttonRow}>
                        <Button
                            appearance="primary"
                            onClick={handleSubmit}
                            disabled={isSaving}
                        >
                            Submit feedback
                        </Button>
                        {isSaving && <Spinner size="tiny" />}
                    </div>
                </>
            )}

            {saveSuccess && (
                <Text className={styles.successText} size={200}>
                    ✓ Thank you for your feedback!
                </Text>
            )}

            {saveError && (
                <Text className={styles.errorText} size={200}>
                    ⚠ Could not save feedback: {saveError}
                </Text>
            )}
        </div>
    );
};
