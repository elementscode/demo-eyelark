import { test, equal } from "@elements/app";
import { seedPractice } from "#app/shared/fixtures";
import { loadDoctors } from "#app/shared/services/schedule";

test("home", () => {
  test("lists the doctors in their set order", () => {
    seedPractice();

    equal(loadDoctors().slice(0, 2).map((d) => d.name), ["Dr. Test Raman", "Dr. Test Okafor"]);
  });
});
