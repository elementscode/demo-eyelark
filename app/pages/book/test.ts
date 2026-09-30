import { test, equal } from "@elements/app";
import { mondayOf, weekDays } from "#app/shared/templates/slot-picker";

test("book", () => {
  test("the picker's week runs Monday to Friday", () => {
    equal(mondayOf("2026-10-01"), "2026-09-28");
    equal(mondayOf("2026-10-04"), "2026-09-28");
    equal(weekDays("2026-09-30"), ["2026-09-28", "2026-09-29", "2026-09-30", "2026-10-01", "2026-10-02"]);
  });
});
