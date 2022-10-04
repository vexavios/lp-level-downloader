const axios = require("axios");
const cheerio = require("cheerio");
const express = require("express");
const fs = require("fs");

const PORT = 4000;
const app = express();

/**
 * Sleep for "ms" milliseconds.
 *
 * @param {*} ms
 * @returns
 */
const sleep = (ms) => {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
};

// name of level creator
let creatorName = encodeURIComponent("INSERT LP LEVEL CREATOR NAME HERE");
// current page of user's levels and necessary lists
let currentLevelListLink = `https://www.levelpalace.com/levels?creator=${creatorName}&level_class=All&sort=newest&difficulty=all&page=1`;
let currentPageLevelLinks = [];
// how long to wait between requests and actions (in milliseconds)
const WAIT_TIME_MS = 10000;

/**
 * Download the next page of user's levels.
 */
const downloadNextLevelPage = () => {
  // reset level links for new page
  currentPageLevelLinks = [];

  // get level links of all levels on page
  sleep(WAIT_TIME_MS).then(() => {
    axios
      .get(currentLevelListLink, { headers: { "User-Agent": "lp-helper" } })
      .then((res) => {
        let $ = cheerio.load(res.data);

        if (
          $("div.table-container:contains('No levels found.')").length === 0
        ) {
          $("div.card-item", "div.card-blocks").each((index, element) => {
            if ($(element).find("a.card-title").length > 0) {
              currentPageLevelLinks.push(
                "https://www.levelpalace.com/" +
                  $(element).find("a.card-title").attr("href")
              );
            }
          });
        } else {
          console.log("No levels were found!");
          process.exit(0);
        }

        // get names and codes of all levels on page
        currentPageLevelLinks.forEach((levelLink, index, allLinks) => {
          sleep(WAIT_TIME_MS).then(() => {
            axios
              .get(levelLink, {
                headers: { "User-Agent": "lp-helper" },
              })
              .then((r) => {
                sleep(WAIT_TIME_MS).then(() => {
                  $ = cheerio.load(r.data);
                  let currentLevelName;

                  $("p.brand-logo", "div.level-section").each(
                    (inx, element) => {
                      currentLevelName = $(element).text().trim();
                    }
                  );

                  $("textarea.level-code-textarea", "div.level-code").each(
                    (inx, element) => {
                      fs.writeFileSync(
                        `levels/${currentLevelName}.txt`,
                        $(element).text()
                      );

                      console.log(
                        `Successfully saved level "${currentLevelName}"!`
                      );
                    }
                  );
                });
              })
              .catch((err) => console.error(err));
          });
        });

        // check for next page, if it exists, call function recursively until no pages remain
        sleep(WAIT_TIME_MS).then(() => {
          $ = cheerio.load(res.data);

          $("li:not(.disabled):not(.active)", "ul.pagination").each(
            (index, element) => {
              if (
                $(element).find("a").find("i.material-icons").text() ===
                "chevron_right"
              ) {
                // increment page number by 1 in level list link
                currentLevelListLink =
                  currentLevelListLink.slice(0, -1) +
                  (parseInt(currentLevelListLink.slice(-1)) + 1);

                downloadNextLevelPage();
              }
            }
          );
        });
      });
  });
};

app.listen(PORT, () => {
  console.log(`Server running on port: ${PORT}`);
  console.log("Downloading levels...");
  downloadNextLevelPage();
});
