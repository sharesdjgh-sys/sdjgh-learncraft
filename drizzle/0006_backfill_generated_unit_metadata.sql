UPDATE "units" AS unit
SET
	"chapter_title" = COALESCE(source.value ->> 'chapterTitle', unit."chapter_title"),
	"chapter_order" = COALESCE((source.value ->> 'chapterOrder')::integer, unit."chapter_order"),
	"section_title" = COALESCE(source.value ->> 'sectionTitle', unit."section_title"),
	"section_order" = COALESCE((source.value ->> 'sectionOrder')::integer, unit."section_order"),
	"topic_order" = COALESCE((source.value ->> 'topicOrder')::integer, unit."topic_order"),
	"recommended_questions" = COALESCE(source.value -> 'recommendedQuestions', unit."recommended_questions"),
	"keywords" = COALESCE(source.value -> 'keywords', unit."keywords"),
	"common_mistakes" = COALESCE(source.value -> 'commonMistakes', unit."common_mistakes"),
	"assessment_tags" = COALESCE(source.value -> 'assessmentTags', unit."assessment_tags"),
	"source_url" = COALESCE(source.value ->> 'sourceUrl', unit."source_url")
FROM "generated_course_contents" AS generated
CROSS JOIN LATERAL jsonb_array_elements(generated."units_json") AS source(value)
WHERE source.value ->> 'id' = unit."id"::text;
--> statement-breakpoint
UPDATE "courses" AS course
SET
	"publisher_name" = COALESCE(NULLIF(source.publisher_name, ''), course."publisher_name"),
	"source_url" = COALESCE(source.source_url, course."source_url")
FROM (
	SELECT DISTINCT ON (generated."course_id")
		generated."course_id",
		unit.value ->> 'publisherName' AS publisher_name,
		unit.value ->> 'sourceUrl' AS source_url
	FROM "generated_course_contents" AS generated
	CROSS JOIN LATERAL jsonb_array_elements(generated."units_json") AS unit(value)
	ORDER BY generated."course_id", generated."updated_at" DESC
) AS source
WHERE source."course_id" = course."id";
